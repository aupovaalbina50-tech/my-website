import { supabase } from '../../../supabaseClient'

// Calls to the smart-report Edge Function («Рапортты құрастыру»). Separate
// from the terminology expertise client: different function, different
// actions. Signed-in users only — the user's token is always sent.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/smart-report`

/** Error with a stable `code` (same codes as the Edge Function returns). */
export class ReportError extends Error {
  constructor(code, { retryAfterSeconds } = {}) {
    super(code)
    this.name = 'ReportError'
    this.code = code
    this.retryAfterSeconds = retryAfterSeconds
  }
}

async function callReport(payload) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ReportError('unauthorized')

  let res
  try {
    res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new ReportError('network')
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ReportError(body?.error || 'internal_error', { retryAfterSeconds: body?.retryAfterSeconds })
  return body
}

/** Facts of step 2 from the user's description. */
export function extractFacts(text, lang) {
  return callReport({ action: 'extract', lang, text })
}

/** Professional wording + the draft's sections. `facts` is { key: string }. */
export function composeReport({ text, facts, sections, lang }) {
  return callReport({ action: 'compose', lang, text, facts, sections })
}

/** Base terms found in the (edited) report text — no AI. */
export function termsInReport(texts, lang) {
  return callReport({ action: 'terms', lang, texts })
}
