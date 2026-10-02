// doc-inspector — Supabase Edge Function behind «Цифровой инспектор МЧС».
//
// The browser does the file handling (DOCX/PDF text extraction, rendering
// scanned pages to images, building the corrected file); this function does
// the parts that need the glossary or an AI key. Three actions:
//
//   POST { action: 'ocr', image: <base64>, mediaType: 'image/jpeg'|'image/png'|'image/webp' }
//     -> 200 { readable: boolean, text: string, model }
//     Verbatim transcription of one page image (scans, photos).
//
//   POST { action: 'analyze', lang: 'kk'|'ru', segments: [{ page, offset, text }] }
//     -> 200 { results: Result[], ai: { status, model?, error? }, glossarySize }
//     Terminology check of one chunk of the document (see analyze.ts).
//
//   POST { action: 'lookup', lang, phrases: [{ phrase, context }] }   (≤ 10 phrases)
//     -> 200 { results: [{ phrase, found, officialTerm, sourceTitle, sourceUrl, reason }] }
//     Official-source web search for phrases with no match in the base (lookup.ts).
//
//   Headers: apikey + Authorization: Bearer <user JWT or anon key>
//   Errors:  4xx/5xx { error: <code>, message }
//     bad_request (400) · payload_too_large (413) · unsupported_file (415)
//     rate_limited (429) · image_rejected, refused (422)
//     ai_busy, ai_unavailable (503) · truncated, bad_response (502)
//     config_error, glossary_unavailable, internal_error (500)

import { decodeBase64 } from 'jsr:@std/encoding@1/base64'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { loadGlossary } from './glossary.ts'
import { analyzeSegments, type Segment } from './analyze.ts'
import { callModel, InspectionError, type ImageMediaType } from './llm.ts'
import { OCR_PROMPT, OCR_SCHEMA } from './systemPrompt.ts'
import { lookupOfficial, type LookupPhrase } from './lookup.ts'
import { enforceInspectorLimits } from './rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// The browser downscales page images to ~2000px JPEG, far below this.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
// One analyze request = one chunk; the browser splits longer documents.
const MAX_CHUNK_CHARS = 40_000
const MAX_SEGMENTS = 200

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

/** Real image type from the first bytes, not the declared MIME type. */
function sniffImageType(bytes: Uint8Array): ImageMediaType | null {
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b)
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to))
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
}

/** Signed-in user's id from the bearer JWT, or null for anonymous visitors. */
async function userIdFrom(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token || token === Deno.env.get('SUPABASE_ANON_KEY')) return null
  const { data } = await supabaseAdmin.auth.getUser(token)
  return data.user?.id ?? null
}

function parseSegments(value: unknown): Segment[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SEGMENTS) return null
  const segments: Segment[] = []
  for (const s of value) {
    if (!s || typeof s.text !== 'string' || !Number.isInteger(s.page) || !Number.isInteger(s.offset)) return null
    if (s.page < 1 || s.offset < 0) return null
    segments.push({ page: s.page, offset: s.offset, text: s.text })
  }
  return segments
}

async function handleOcr(body: any) {
  if (typeof body.image !== 'string') return fail(400, 'bad_request', 'image (base64) is required')
  let bytes: Uint8Array
  try {
    bytes = decodeBase64(body.image)
  } catch {
    return fail(400, 'bad_request', 'image is not valid base64')
  }
  if (bytes.length === 0) return fail(400, 'bad_request', 'image is empty')
  if (bytes.length > MAX_IMAGE_BYTES) return fail(413, 'payload_too_large', 'The page image must be 5 MB or smaller')
  const mediaType = sniffImageType(bytes)
  if (!mediaType) return fail(415, 'unsupported_file', 'The page image must be JPEG, PNG or WebP')

  const { json: out, model } = await callModel({
    system: OCR_PROMPT,
    parts: [
      { type: 'image', mediaType, data: body.image },
      { type: 'text', text: 'Распознай весь текст этой страницы дословно.' },
    ],
    schema: OCR_SCHEMA,
    maxTokens: 12000,
  })
  const text = typeof out?.text === 'string' ? out.text : ''
  return json({ readable: Boolean(out?.readable) && text.trim().length > 0, text, model })
}

async function handleAnalyze(body: any) {
  const segments = parseSegments(body.segments)
  if (!segments) return fail(400, 'bad_request', 'segments must be a non-empty array of { page, offset, text }')
  const chars = segments.reduce((n, s) => n + s.text.length, 0)
  if (chars > MAX_CHUNK_CHARS) return fail(413, 'payload_too_large', `A chunk may contain at most ${MAX_CHUNK_CHARS} characters`)
  const lang = body.lang === 'kk' ? 'kk' : 'ru'

  let glossary
  try {
    glossary = await loadGlossary()
  } catch (error) {
    console.error('doc-inspector glossary error:', error)
    return fail(500, 'glossary_unavailable', 'The term glossary could not be loaded')
  }

  const report = await analyzeSegments(segments, glossary, lang)
  return json({ ...report, glossarySize: glossary.length })
}

const MAX_LOOKUP_PHRASES = 10

async function handleLookup(body: any) {
  const phrases: LookupPhrase[] = Array.isArray(body.phrases)
    ? body.phrases
        .filter((p: any) => typeof p?.phrase === 'string' && p.phrase.trim())
        .slice(0, MAX_LOOKUP_PHRASES)
        .map((p: any) => ({ phrase: p.phrase.slice(0, 200), context: String(p.context ?? '').slice(0, 400) }))
    : []
  if (!phrases.length) return fail(400, 'bad_request', 'phrases must be a non-empty array of { phrase, context }')
  const lang = body.lang === 'kk' ? 'kk' : 'ru'
  return json({ results: await lookupOfficial(phrases, lang) })
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
  if (!['ocr', 'analyze', 'lookup'].includes(body?.action)) {
    return fail(400, 'bad_request', 'action must be "ocr", "analyze" or "lookup"')
  }

  // Rate limit (per signed-in user, else per IP). Each page OCR and each
  // analyzed chunk is one AI call, so each counts.
  const who = (await userIdFrom(req)) ?? `ip:${clientIp(req)}`
  const limit = await enforceInspectorLimits(who)
  if (!limit.allowed) {
    return json(
      { error: 'rate_limited', reason: limit.reason, retryAfterSeconds: limit.retryAfterSeconds },
      429,
      limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : {},
    )
  }

  try {
    if (body.action === 'ocr') return await handleOcr(body)
    if (body.action === 'lookup') return await handleLookup(body)
    return await handleAnalyze(body)
  } catch (error) {
    if (error instanceof InspectionError) {
      console.error(`doc-inspector ${error.code}:`, error.message)
      return fail(error.status, error.code, error.message)
    }
    console.error('doc-inspector unexpected error:', error)
    return fail(500, 'internal_error', 'Unexpected server error')
  }
})
