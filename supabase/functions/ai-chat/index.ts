import { resolveProviderChain } from './providers/index.ts'
import { buildSystemPrompt } from './systemPrompt.ts'
import { enforceRateLimits, getClientIp } from './rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_MESSAGE_LENGTH = 2000
const MAX_HISTORY_MESSAGES = 8

function jsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: { message?: unknown; history?: unknown; context?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return jsonResponse({ error: 'message is required' }, 400)
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse({ error: `message exceeds ${MAX_MESSAGE_LENGTH} characters` }, 400)
  }

  const rawHistory = Array.isArray(body.history) ? body.history : []
  const history = rawHistory
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length <= MAX_MESSAGE_LENGTH,
    )
    .slice(-MAX_HISTORY_MESSAGES)

  const context = typeof body.context === 'string' ? body.context.slice(0, 6000) : ''

  const clientIp = getClientIp(req)
  const rateLimit = await enforceRateLimits(clientIp)
  if (!rateLimit.allowed) {
    return jsonResponse(
      { error: 'rate_limited', reason: rateLimit.reason, retryAfterSeconds: rateLimit.retryAfterSeconds },
      429,
      rateLimit.retryAfterSeconds ? { 'Retry-After': String(rateLimit.retryAfterSeconds) } : undefined,
    )
  }

  let chain
  try {
    chain = resolveProviderChain()
  } catch (err) {
    console.error('ai-chat config error:', err)
    const errMessage = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: errMessage }, 500)
  }

  const systemPrompt = buildSystemPrompt(context)
  const messages = [...history, { role: 'user' as const, content: message }]

  const failures: string[] = []
  for (const provider of chain) {
    try {
      const reply = await provider.generate({
        systemPrompt,
        messages,
        apiKey: provider.apiKey,
        model: provider.model,
      })
      return jsonResponse({ reply, provider: provider.name })
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error(`ai-chat provider "${provider.name}" failed, trying next:`, errMessage)
      failures.push(`${provider.name}: ${errMessage}`)
    }
  }

  // Every configured provider failed (quota, outage, bad key, ...).
  return jsonResponse({ error: `All AI providers failed. ${failures.join(' | ')}` }, 502)
})
