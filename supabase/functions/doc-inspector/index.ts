// doc-inspector — Supabase Edge Function behind «Цифровой инспектор МЧС».
//
// Request:  POST multipart/form-data
//             file — the document photo (JPEG / PNG / WebP / GIF, up to 5 MB)
//             lang — 'kk' | 'ru', language of the explanations (default 'ru')
//           Headers: apikey + Authorization: Bearer <user JWT or anon key>
// Response: 200 { readable, documentLanguage, findings: Finding[], model }
//           4xx/5xx { error: <code>, message } — codes listed in README below
//
// Flow: validate the upload -> rate-limit -> load glossary -> vision model
// -> attach glossary entries -> JSON back to the browser.
//
// Vision model: Claude (inspection.ts) when the ANTHROPIC_API_KEY secret is
// set, otherwise Gemini's free tier (gemini.ts) with the GEMINI_API_KEY
// secret the ai-chat assistant already uses. API keys never leave the server.
//
// Error codes the frontend handles:
//   no_file, empty_file (400) · file_too_large (413) · unsupported_file (415)
//   rate_limited (429) · image_rejected, refused (422)
//   ai_busy, ai_unavailable (503) · truncated, bad_response (502)
//   config_error, glossary_unavailable, internal_error (500)

import { encodeBase64 } from 'jsr:@std/encoding@1/base64'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { loadGlossary } from './glossary.ts'
import { inspectWithClaude, InspectionError, type ImageMediaType, type InspectParams } from './inspection.ts'
import { inspectWithGemini } from './gemini.ts'
import { enforceInspectorLimits } from './rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Claude accepts images up to 5 MB each. The frontend downscales photos to
// ~2000px JPEG before upload, so real uploads are far below this.
const MAX_FILE_BYTES = 5 * 1024 * 1024

const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  })
}

function fail(status: number, error: string, message: string, extraHeaders?: Record<string, string>) {
  return json({ error, message }, status, extraHeaders)
}

/**
 * Detects the real image type from the file's first bytes (magic numbers)
 * instead of trusting the browser-declared MIME type. Returns null for
 * anything that isn't a supported, structurally valid image header — that
 * covers both unsupported formats (HEIC, PDF, ...) and corrupted files.
 */
function sniffImageType(bytes: Uint8Array): ImageMediaType | null {
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b)
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return 'image/gif'
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST')

  // ---- 1. Read and validate the upload --------------------------------
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return fail(400, 'no_file', 'Expected multipart/form-data with a "file" field')
  }

  const file = form.get('file')
  if (!(file instanceof File)) return fail(400, 'no_file', 'No file was uploaded')
  if (file.size === 0) return fail(400, 'empty_file', 'The uploaded file is empty')
  if (file.size > MAX_FILE_BYTES) return fail(413, 'file_too_large', 'The image must be 5 MB or smaller')

  const bytes = new Uint8Array(await file.arrayBuffer())
  const mediaType = sniffImageType(bytes)
  if (!mediaType) {
    return fail(415, 'unsupported_file', 'Upload a JPEG, PNG, WebP or GIF image; the file is unsupported or damaged')
  }

  const lang = form.get('lang') === 'kk' ? 'kk' : 'ru'

  // ---- 2. Rate limit (per signed-in user, else per IP) ----------------
  const who = (await userIdFrom(req)) ?? `ip:${clientIp(req)}`
  const limit = await enforceInspectorLimits(who)
  if (!limit.allowed) {
    return json(
      { error: 'rate_limited', reason: limit.reason, retryAfterSeconds: limit.retryAfterSeconds },
      429,
      limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : {},
    )
  }

  // ---- 3. Glossary -----------------------------------------------------
  let glossary
  try {
    glossary = await loadGlossary()
  } catch (error) {
    console.error('doc-inspector glossary error:', error)
    return fail(500, 'glossary_unavailable', 'The term glossary could not be loaded')
  }

  // ---- 4. Vision inspection ----------------------------------------------
  const params: InspectParams = { imageBase64: encodeBase64(bytes), mediaType, explanationLang: lang, glossary }
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  try {
    let result
    if (Deno.env.get('ANTHROPIC_API_KEY')) result = await inspectWithClaude(params)
    else if (geminiKey) result = await inspectWithGemini(params, geminiKey)
    else return fail(500, 'config_error', 'Set the GEMINI_API_KEY (free) or ANTHROPIC_API_KEY secret')
    return json(result)
  } catch (error) {
    if (error instanceof InspectionError) {
      console.error(`doc-inspector ${error.code}:`, error.message)
      return fail(error.status, error.code, error.message)
    }
    console.error('doc-inspector unexpected error:', error)
    return fail(500, 'internal_error', 'Unexpected server error')
  }
})
