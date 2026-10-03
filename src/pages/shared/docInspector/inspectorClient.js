import { supabase } from '../../../supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/doc-inspector`

/** Error with a stable `code` (same codes as the Edge Function returns). */
export class InspectorError extends Error {
  constructor(code, { retryAfterSeconds, reason } = {}) {
    super(code)
    this.name = 'InspectorError'
    this.code = code
    this.retryAfterSeconds = retryAfterSeconds
    this.reason = reason
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new InspectorError('unsupported_file'))
    reader.readAsDataURL(blob)
  })
}

// Transient gateway / platform failures (546 = the Edge Function hit a
// resource limit) are worth one or two more tries before giving up.
const RETRY_STATUSES = new Set([502, 503, 504, 546])
const RETRY_DELAYS_MS = [1500, 4000]

/**
 * POSTs one action to the doc-inspector Edge Function, retrying transient
 * platform failures. The signed-in user's token is sent when available
 * (rate limits are then per user, not per IP); otherwise the public anon
 * key. AI keys only ever live on the server.
 */
async function callInspector(payload) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await callOnce(payload)
    } catch (error) {
      if (!(error.transient && attempt < RETRY_DELAYS_MS.length)) throw error
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
    }
  }
}

async function callOnce(payload) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token || SUPABASE_ANON_KEY

  let res
  try {
    res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new InspectorError('network_error')
  }

  const body = await res.json().catch(() => null)
  // 404 from the Supabase gateway = the doc-inspector function isn't deployed.
  if (res.status === 404) throw new InspectorError('service_unavailable')
  if (!res.ok) {
    const error = new InspectorError(body?.error || 'internal_error', {
      retryAfterSeconds: body?.retryAfterSeconds,
      reason: body?.reason,
    })
    error.transient = RETRY_STATUSES.has(res.status) && body?.error !== 'rate_limited'
    throw error
  }
  if (!body) throw new InspectorError('bad_response')
  return body
}

/**
 * Verbatim OCR of one page image (JPEG).
 * @returns {Promise<{ readable: boolean, text: string }>}
 */
export async function ocrPage(blob) {
  const body = await callInspector({ action: 'ocr', image: await blobToBase64(blob), mediaType: 'image/jpeg' })
  if (typeof body.text !== 'string') throw new InspectorError('bad_response')
  return body
}

/**
 * Official-source search for phrases the base has no match for.
 * @param {Array<{ phrase: string, context: string }>} phrases  at most 10
 * @returns {Promise<Array<{ phrase: string, found: boolean, officialTerm: string|null, sourceTitle: string|null, sourceUrl: string|null, reason: string }>>}
 */
export async function lookupPhrases(phrases, lang) {
  const body = await callInspector({ action: 'lookup', lang: lang === 'kk' ? 'kk' : 'ru', phrases })
  if (!Array.isArray(body.results)) throw new InspectorError('bad_response')
  return body.results
}

/**
 * Terminology check of one chunk.
 * @param {Array<{ page: number, offset: number, text: string }>} segments
 * @param {'kk'|'ru'} lang  language of the explanations
 * @returns {Promise<{ results: Array<object>, ai: { status: 'ok'|'failed', model?: string, error?: string }, glossarySize: number }>}
 */
export async function analyzeChunk(segments, lang) {
  const body = await callInspector({ action: 'analyze', lang: lang === 'kk' ? 'kk' : 'ru', segments })
  if (!Array.isArray(body.results)) throw new InspectorError('bad_response')
  return body
}
