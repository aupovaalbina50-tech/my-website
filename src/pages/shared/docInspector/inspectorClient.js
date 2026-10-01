import { supabase } from '../../../supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/doc-inspector`

// Longest side after downscaling. Phone photos are often 4000px+ and several
// MB; Claude reads document text well at this size, and the upload stays far
// below the 5 MB per-image API limit.
const MAX_SIDE = 2000
const JPEG_QUALITY = 0.88

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

/**
 * Step 1 (in the browser): normalise the photo before upload.
 *  - decodes it (applying EXIF rotation, so a portrait phone photo isn't sideways)
 *  - downscales to MAX_SIDE and re-encodes as JPEG
 * Anything the browser can't decode (a PDF, a damaged file, HEIC outside
 * Safari) is rejected here with `unsupported_file`, before any network call.
 *
 * @param {File} file
 * @returns {Promise<{ blob: Blob, previewUrl: string }>}
 */
export async function prepareImage(file) {
  if (!file || file.size === 0) throw new InspectorError('empty_file')
  if (!file.type.startsWith('image/')) throw new InspectorError('unsupported_file')

  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new InspectorError('unsupported_file')
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // transparent PNGs become white paper, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new InspectorError('unsupported_file')
  return { blob, previewUrl: URL.createObjectURL(blob) }
}

/**
 * Step 2: send the prepared image to the doc-inspector Edge Function.
 * The signed-in user's token is sent when available (rate limits are then per
 * user, not per IP); otherwise the public anon key. The Anthropic API key is
 * only ever on the server.
 *
 * @param {Blob} blob   JPEG from prepareImage()
 * @param {'kk'|'ru'} lang   language of the explanations
 * @returns {Promise<{ readable: boolean, documentLanguage: string, findings: Array<{
 *   found_text: string, correct_term: string, error_type: string, explanation: string,
 *   term: { id: string, kk: string, ru: string, en: string, category: string } | null }> }>}
 */
export async function inspectDocument(blob, lang) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token || SUPABASE_ANON_KEY

  const form = new FormData()
  form.append('file', blob, 'document.jpg')
  form.append('lang', lang === 'kk' ? 'kk' : 'ru')

  let res
  try {
    res = await fetch(FUNCTION_URL, {
      method: 'POST',
      // No Content-Type here: the browser sets the multipart boundary itself.
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      body: form,
    })
  } catch {
    throw new InspectorError('network_error')
  }

  const body = await res.json().catch(() => null)
  // 404 from the Supabase gateway = the doc-inspector function isn't deployed.
  if (res.status === 404) throw new InspectorError('ai_unavailable')
  if (!res.ok) {
    throw new InspectorError(body?.error || 'internal_error', {
      retryAfterSeconds: body?.retryAfterSeconds,
      reason: body?.reason,
    })
  }
  if (!body || !Array.isArray(body.findings)) throw new InspectorError('bad_response')
  return body
}
