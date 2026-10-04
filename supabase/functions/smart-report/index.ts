// smart-report — Supabase Edge Function behind «Рапортты құрастыру /
// Составление рапорта» (personal account only).
//
// Separate from doc-inspector: that one CHECKS a finished document, this one
// helps CREATE a report from a description of the situation. It only reads
// shared building blocks of doc-inspector (glossary loading, the model call,
// the deterministic term matcher); it never changes them. The pipeline
// itself lives in pipeline.ts.
//
//   POST { action: 'extract', lang: 'kk'|'ru', text, today }
//     -> 200 { title, facts: { <key>: { value, quote, inferred } }, events: [{ time, text }], model }
//
//   POST { action: 'compose', lang, text, facts: { <key>: string }, inferred: [key], sections: [{ key, title, guidance }] }
//     -> 200 { phrasing: [{ original, professional }], sections: [{ key, text }], terms, variants, model }
//
//   POST { action: 'review', lang, header: { to, from }, sections: [{ key, text }], facts: { <key>: string } }
//     -> 200 { corrections: [{ target, was, now, reason, kind }], issues: [{ kind, title, details }], model }
//
//   POST { action: 'terms', lang, texts: string[] }       (no AI)
//     -> 200 { terms, variants }
//
// «Конструктор профессиональной документации» (docs.ts):
//   POST { action: 'doc_suggest', lang, query, catalog: [{ id, title, purpose }] } -> { suggestions: [{ id, why }] }
//   POST { action: 'doc_fill', lang, text, today, documentTitle, fields: [{ key, label, type, hint, options }] }
//     -> { values: [{ key, value, quote }], missing: [key] }
//   POST { action: 'doc_check', lang, documentTitle, blocks: [{ key, label, text }] }
//     -> { issues: [{ category, target, was, now, title, reason, basis, confirmed }], terms, variants }
//   POST { action: 'doc_photo', mediaType, data (base64) } -> { lines: [{ text, sure }], lang }
//
//   terms:    [{ id, kk, ru, en, category, matches: [fragment as written] }]
//   variants: [{ text, official }]
//
//   Headers: apikey + Authorization: Bearer <user JWT> (signed-in users only)
//   Errors:  4xx/5xx { error: <code>, message }
//     unauthorized (401) · bad_request (400) · payload_too_large (413)
//     rate_limited (429) · refused (422) · ai_busy, ai_unavailable (503)
//     truncated, bad_response (502) · config_error, glossary_unavailable, internal_error (500)

import { createClient } from 'npm:@supabase/supabase-js@2'
import { composeReport, extractFacts, reviewReport, termsForTexts } from './pipeline.ts'
import { InspectionError } from '../doc-inspector/llm.ts'
import { enforceReportLimits } from './rateLimit.ts'
import { checkDocument, fillFields, readPhoto, suggestDocument } from './docs.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ACTIONS = ['extract', 'compose', 'review', 'terms', 'doc_suggest', 'doc_fill', 'doc_check', 'doc_photo']

const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  })
}

function fail(status: number, error: string, message: string) {
  return json({ error, message }, status)
}

async function userIdFrom(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token || token === Deno.env.get('SUPABASE_ANON_KEY')) return null
  const { data } = await supabaseAdmin.auth.getUser(token)
  return data.user?.id ?? null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST')

  let body: any
  try {
    body = await req.json()
  } catch {
    return fail(400, 'bad_request', 'Expected a JSON body')
  }
  if (!ACTIONS.includes(body?.action)) return fail(400, 'bad_request', `action must be one of: ${ACTIONS.join(', ')}`)

  // A personal-account tool: signed-in users only.
  const userId = await userIdFrom(req)
  if (!userId) return fail(401, 'unauthorized', 'Sign in to use the report tool')
  const lang = body.lang === 'kk' ? 'kk' : 'ru'

  try {
    if (body.action === 'terms') return json(await termsForTexts(body.texts, lang))

    const limit = await enforceReportLimits(userId)
    if (!limit.allowed) {
      return json(
        { error: 'rate_limited', reason: limit.reason, retryAfterSeconds: limit.retryAfterSeconds },
        429,
        limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : {},
      )
    }
    if (body.action === 'extract') return json(await extractFacts(body.text, lang, body.today))
    if (body.action === 'compose') return json(await composeReport(body, lang))
    if (body.action === 'doc_suggest') return json(await suggestDocument(body, lang))
    if (body.action === 'doc_fill') return json(await fillFields(body, lang))
    if (body.action === 'doc_check') return json(await checkDocument(body, lang))
    if (body.action === 'doc_photo') return json(await readPhoto(body))
    if (body.action !== 'review') return fail(400, 'bad_request', 'unknown action')
    return json(await reviewReport(body, lang))
  } catch (error) {
    if (error instanceof InspectionError) {
      console.error(`smart-report ${error.code}:`, error.message)
      return fail(error.status, error.code, error.message)
    }
    console.error('smart-report unexpected error:', error)
    return fail(500, 'internal_error', 'Unexpected server error')
  }
})
