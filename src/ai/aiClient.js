import { buildContext } from './knowledgeBase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-chat`

export class RateLimitError extends Error {
  constructor(reason, retryAfterSeconds) {
    super('rate_limited')
    this.name = 'RateLimitError'
    this.reason = reason
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/**
 * Sends a user message to the ai-chat Supabase Edge Function, grounded in
 * the site's own data. The Edge Function itself decides which external LLM
 * provider to call (Gemini by default, Groq/OpenRouter as configured
 * fallbacks) — the client never talks to the LLM provider directly and
 * never sees its API key. The Edge Function also rate-limits per IP and
 * globally to protect the free quota.
 *
 * @param {{ message: string, history: {role: 'user'|'assistant', content: string}[] }} params
 * @returns {Promise<{ reply: string, found: boolean }>}
 */
export async function askAssistant({ message, history }) {
  const { contextText, found } = await buildContext(message)

  if (!found) {
    return { reply: null, found: false }
  }

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      message,
      history: history.slice(-8),
      context: contextText,
    }),
  })

  if (res.status === 429) {
    const body = await res.json().catch(() => ({}))
    throw new RateLimitError(body.reason, body.retryAfterSeconds)
  }

  if (!res.ok) {
    throw new Error(`Assistant request failed with status ${res.status}`)
  }

  const data = await res.json()
  if (!data || typeof data.reply !== 'string') {
    throw new Error('Empty response from assistant')
  }

  return { reply: data.reply, found: true }
}
