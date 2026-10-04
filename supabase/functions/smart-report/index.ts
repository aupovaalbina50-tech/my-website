// smart-report — Supabase Edge Function behind «Рапортты құрастыру /
// Составление рапорта» (personal account only).
//
// Separate from doc-inspector: that one CHECKS a finished document, this one
// helps CREATE a report from a description of the situation. It only reads
// two shared building blocks of doc-inspector (glossary loading and the
// model call) and its deterministic term matcher; it never changes them.
//
//   POST { action: 'extract', lang: 'kk'|'ru', text }
//     -> 200 { title, facts: { <key>: { value, quote } }, events: [{ time, text }], model }
//
//   POST { action: 'compose', lang, text, facts: { <key>: string }, sections: [{ key, title, guidance }] }
//     -> 200 { phrasing: [{ original, professional }], sections: [{ key, text }], terms, variants, model }
//
//   POST { action: 'terms', lang, texts: string[] }       (no AI)
//     -> 200 { terms, variants }
//     Base terms that occur in the (edited) report text, for the final check.
//
//   terms:    [{ id, kk, ru, en, category }] — base terms found in the text
//   variants: [{ text, official }]           — unofficial wordings with the official term
//
//   Headers: apikey + Authorization: Bearer <user JWT> (signed-in users only)
//   Errors:  4xx/5xx { error: <code>, message }
//     unauthorized (401) · bad_request (400) · payload_too_large (413)
//     rate_limited (429) · refused (422) · ai_busy, ai_unavailable (503)
//     truncated, bad_response (502) · config_error, glossary_unavailable, internal_error (500)

import { createClient } from 'npm:@supabase/supabase-js@2'
import { loadGlossary, type GlossaryTerm } from '../doc-inspector/glossary.ts'
import { callModel, InspectionError } from '../doc-inspector/llm.ts'
import { findTerms, formsFor, primaryText } from '../doc-inspector/matcher.ts'
import { COMPOSE_SCHEMA, composePrompt, EXTRACT_SCHEMA, extractPrompt, FACT_KEYS, type SectionSpec } from './prompts.ts'
import { enforceReportLimits } from './rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_SOURCE_CHARS = 8000
const MAX_FACT_CHARS = 1000
const MAX_SECTIONS = 12
const MAX_TERMS_CHARS = 30000

// Categories offered to the model as wording vocabulary. Narrow technical
// terms (industrial_safety) are left out to keep the prompt focused.
const REPORT_CATEGORIES = new Set([
  'fire_safety',
  'rescue_ops',
  'emergencies',
  'evacuation',
  'coordination',
  'disaster_medicine',
  'civil_defense',
  'alerting_comms',
])

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

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

let cachedLines: { source: GlossaryTerm[]; lines: string } | null = null

function glossaryLines(glossary: GlossaryTerm[]): string {
  if (cachedLines?.source === glossary) return cachedLines.lines
  const lines = glossary
    .filter((t) => REPORT_CATEGORIES.has(t.category) && t.ru && t.kk)
    .map((t) => `${t.ru} — ${t.kk}`)
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .join('\n')
  cachedLines = { source: glossary, lines }
  return lines
}

/** Base terms and unofficial wordings found, deterministically, in the text. */
function termsIn(text: string, glossary: GlossaryTerm[], lang: 'kk' | 'ru') {
  const terms = new Map<string, { id: string; kk: string | null; ru: string | null; en: string | null; category: string }>()
  const variants = new Map<string, { text: string; official: string }>()
  for (const m of findTerms(text, formsFor(glossary))) {
    const t = m.form.term
    if (m.status === 'variant') {
      variants.set(m.text.toLowerCase(), { text: m.text, official: primaryText(t, lang) })
    } else if (m.status === 'ok' || m.status === 'fix') {
      terms.set(t.id, { id: t.id, kk: t.kk, ru: t.ru, en: t.en, category: t.category })
    }
  }
  return { terms: [...terms.values()], variants: [...variants.values()] }
}

async function glossaryOrFail(): Promise<GlossaryTerm[]> {
  try {
    return await loadGlossary()
  } catch (error) {
    console.error('smart-report glossary error:', error)
    throw new InspectionError(500, 'glossary_unavailable', 'The term glossary could not be loaded')
  }
}

async function handleExtract(body: any, lang: 'kk' | 'ru') {
  const text = str(body.text, MAX_SOURCE_CHARS + 1)
  if (!text) return fail(400, 'bad_request', 'text is required')
  if (text.length > MAX_SOURCE_CHARS) return fail(413, 'payload_too_large', `At most ${MAX_SOURCE_CHARS} characters`)

  const { json: out, model } = await callModel({
    system: extractPrompt(lang),
    parts: [{ type: 'text', text: `Описание ситуации:\n"""\n${text}\n"""` }],
    schema: EXTRACT_SCHEMA,
    maxTokens: 6000,
  })

  // Keep a fact only if its quote really is in the description (or it has no
  // quote at all, e.g. a normalised time): no invented facts get through.
  const lower = text.toLowerCase()
  const facts: Record<string, { value: string; quote: string }> = {}
  for (const key of FACT_KEYS) {
    const value = str(out?.facts?.[key]?.value, MAX_FACT_CHARS)
    const quote = str(out?.facts?.[key]?.quote, MAX_FACT_CHARS)
    const grounded = !quote || lower.includes(quote.toLowerCase())
    facts[key] = grounded ? { value, quote } : { value: '', quote: '' }
  }
  const events = Array.isArray(out?.events)
    ? out.events.slice(0, 30).map((e: any) => ({ time: str(e?.time, 10), text: str(e?.text, 400) })).filter((e: any) => e.text)
    : []
  return json({ title: str(out?.title, 120), facts, events, model })
}

function parseSections(raw: unknown): SectionSpec[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_SECTIONS) return null
  const sections = raw.map((s: any) => ({ key: str(s?.key, 40), title: str(s?.title, 120), guidance: str(s?.guidance, 600) }))
  return sections.every((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s.key) && s.title) ? sections : null
}

async function handleCompose(body: any, lang: 'kk' | 'ru') {
  const text = str(body.text, MAX_SOURCE_CHARS + 1)
  if (!text) return fail(400, 'bad_request', 'text is required')
  if (text.length > MAX_SOURCE_CHARS) return fail(413, 'payload_too_large', `At most ${MAX_SOURCE_CHARS} characters`)
  const sections = parseSections(body.sections)
  if (!sections) return fail(400, 'bad_request', 'sections must be a non-empty array of { key, title, guidance }')
  const facts = Object.fromEntries(FACT_KEYS.map((k) => [k, str(body.facts?.[k], MAX_FACT_CHARS)]))

  const glossary = await glossaryOrFail()
  const { json: out, model } = await callModel({
    system: composePrompt(lang, glossaryLines(glossary)),
    parts: [
      {
        type: 'text',
        text: [
          `Описание ситуации:\n"""\n${text}\n"""`,
          `Подтверждённые сведения (пустая строка = нет сведения):\n${JSON.stringify(facts, null, 2)}`,
          `Разделы рапорта (по порядку):\n${sections.map((s) => `- ${s.key}: ${s.title}. ${s.guidance}`).join('\n')}`,
        ].join('\n\n'),
      },
    ],
    schema: COMPOSE_SCHEMA,
    maxTokens: 8000,
  })

  const byKey = new Map<string, string>()
  for (const s of Array.isArray(out?.sections) ? out.sections : []) {
    const key = str(s?.key, 40)
    if (sections.some((spec) => spec.key === key)) byKey.set(key, str(s?.text, 6000))
  }
  const placeholder = lang === 'kk' ? '[көрсетілмеген]' : '[не указано]'
  const composed = sections.map((s) => ({ key: s.key, text: byKey.get(s.key) || placeholder }))
  const phrasing = (Array.isArray(out?.phrasing) ? out.phrasing : [])
    .slice(0, 12)
    .map((p: any) => ({ original: str(p?.original, 600), professional: str(p?.professional, 1200) }))
    .filter((p: any) => p.original && p.professional)

  const found = termsIn(composed.map((s) => s.text).join('\n'), glossary, lang)
  return json({ phrasing, sections: composed, ...found, model })
}

async function handleTerms(body: any, lang: 'kk' | 'ru') {
  const texts = Array.isArray(body.texts) ? body.texts.filter((t: unknown) => typeof t === 'string') : []
  const text = texts.join('\n')
  if (text.length > MAX_TERMS_CHARS) return fail(413, 'payload_too_large', `At most ${MAX_TERMS_CHARS} characters`)
  const glossary = await glossaryOrFail()
  return json(termsIn(text, glossary, lang))
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
  if (!['extract', 'compose', 'terms'].includes(body?.action)) {
    return fail(400, 'bad_request', 'action must be "extract", "compose" or "terms"')
  }

  // A personal-account tool: signed-in users only.
  const userId = await userIdFrom(req)
  if (!userId) return fail(401, 'unauthorized', 'Sign in to use the report tool')
  const lang = body.lang === 'kk' ? 'kk' : 'ru'

  try {
    if (body.action === 'terms') return await handleTerms(body, lang)

    const limit = await enforceReportLimits(userId)
    if (!limit.allowed) {
      return json(
        { error: 'rate_limited', reason: limit.reason, retryAfterSeconds: limit.retryAfterSeconds },
        429,
        limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : {},
      )
    }
    if (body.action === 'extract') return await handleExtract(body, lang)
    return await handleCompose(body, lang)
  } catch (error) {
    if (error instanceof InspectionError) {
      console.error(`smart-report ${error.code}:`, error.message)
      return fail(error.status, error.code, error.message)
    }
    console.error('smart-report unexpected error:', error)
    return fail(500, 'internal_error', 'Unexpected server error')
  }
})
