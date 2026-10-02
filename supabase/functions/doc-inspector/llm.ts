// One structured-JSON model call, on whichever provider is configured:
//   ANTHROPIC_API_KEY set -> Claude (structured outputs via output_config.format)
//   otherwise GEMINI_API_KEY -> Gemini free tier (responseSchema), the same
//   secret the site's ai-chat assistant already uses.
// API keys never leave the server. Both paths return parsed JSON of the
// given schema or throw an InspectionError with a stable code.

import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0'

// Claude Sonnet 5.5 — override with DOC_INSPECTOR_MODEL (e.g. claude-opus-5-5).
const CLAUDE_MODEL = Deno.env.get('DOC_INSPECTOR_MODEL') || 'claude-sonnet-5-5'
const GEMINI_MODEL = Deno.env.get('DOC_INSPECTOR_GEMINI_MODEL') || Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest'

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp'

export type Part = { type: 'text'; text: string } | { type: 'image'; mediaType: ImageMediaType; data: string }

export interface ModelCall {
  system: string
  parts: Part[]
  /** Plain JSON Schema (lower-case types, additionalProperties: false). */
  schema: Record<string, unknown>
  maxTokens: number
}

/** A failure with an HTTP status and a stable code the frontend can switch on. */
export class InspectionError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function aiConfigured(): boolean {
  return Boolean(Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('GEMINI_API_KEY'))
}

export async function callModel(call: ModelCall): Promise<{ json: any; model: string }> {
  if (Deno.env.get('ANTHROPIC_API_KEY')) return callClaude(call)
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (geminiKey) return callGemini(call, geminiKey)
  throw new InspectionError(500, 'config_error', 'Set the GEMINI_API_KEY (free) or ANTHROPIC_API_KEY secret')
}

// ---- Claude ----------------------------------------------------------------

let client: Anthropic | null = null

async function callClaude({ system, parts, schema, maxTokens }: ModelCall) {
  client ??= new Anthropic() // reads ANTHROPIC_API_KEY from the Edge Function secrets
  let response: Anthropic.Beta.BetaMessage
  try {
    response = await client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      // Instructions + full glossary are identical between requests -> cached.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: parts.map((p) =>
            p.type === 'text'
              ? { type: 'text' as const, text: p.text }
              : { type: 'image' as const, source: { type: 'base64' as const, media_type: p.mediaType, data: p.data } },
          ),
        },
      ],
    })
  } catch (error) {
    if (error instanceof Anthropic.BadRequestError) throw new InspectionError(422, 'image_rejected', error.message)
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new InspectionError(500, 'config_error', 'Anthropic API key is missing or invalid')
    }
    if (error instanceof Anthropic.RateLimitError) throw new InspectionError(503, 'ai_busy', 'Anthropic API rate limit reached')
    if (error instanceof Anthropic.APIConnectionError) throw new InspectionError(503, 'ai_unavailable', 'Anthropic API is unreachable')
    if (error instanceof Anthropic.APIError) {
      throw new InspectionError(502, 'ai_unavailable', `Anthropic API error ${error.status}: ${error.message}`)
    }
    throw error
  }

  if (response.stop_reason === 'refusal') {
    throw new InspectionError(422, 'refused', response.stop_details?.explanation || 'The model declined this request')
  }
  if (response.stop_reason === 'max_tokens') throw new InspectionError(502, 'truncated', 'The model output was cut off')

  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
  try {
    return { json: JSON.parse(text), model: response.model }
  } catch {
    throw new InspectionError(502, 'bad_response', 'The model returned malformed JSON')
  }
}

// ---- Web search restricted to official domains ------------------------------

export interface SearchCall {
  system: string
  text: string
  /** Hostnames the search may use (subdomains included). */
  allowedDomains: string[]
}

/**
 * A model call with web search limited to `allowedDomains`. Returns the
 * model's final text and the pages the search ACTUALLY returned, so the
 * caller can reject any source URL the model did not really see.
 */
export async function searchWithModel(call: SearchCall): Promise<{ text: string; seen: Array<{ url: string; title: string }> }> {
  if (Deno.env.get('ANTHROPIC_API_KEY')) return searchWithClaude(call)
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (geminiKey) return searchWithGemini(call, geminiKey)
  throw new InspectionError(500, 'config_error', 'Set the GEMINI_API_KEY (free) or ANTHROPIC_API_KEY secret')
}

async function searchWithClaude({ system, text, allowedDomains }: SearchCall) {
  client ??= new Anthropic()
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: text }]
  const seen: Array<{ url: string; title: string }> = []
  let finalText = ''
  // Server tools may return pause_turn on long searches: resend to continue.
  for (let round = 0; round < 3; round++) {
    let response: Anthropic.Beta.BetaMessage
    try {
      response = await client.beta.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system,
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6, allowed_domains: allowedDomains }],
        messages,
      })
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) throw new InspectionError(503, 'ai_busy', 'Anthropic API rate limit reached')
      if (error instanceof Anthropic.APIError) throw new InspectionError(502, 'ai_unavailable', `Anthropic API error ${error.status}: ${error.message}`)
      throw error
    }
    if (response.stop_reason === 'refusal') throw new InspectionError(422, 'refused', 'The model declined the lookup')
    for (const block of response.content) {
      // An error result has an object as content; a success has a list.
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const r of block.content) if (r.type === 'web_search_result') seen.push({ url: r.url, title: r.title })
      }
      if (block.type === 'text') finalText += block.text
    }
    if (response.stop_reason !== 'pause_turn') break
    messages.push({ role: 'assistant', content: response.content })
  }
  return { text: finalText, seen }
}

async function searchWithGemini({ system, text, allowedDomains }: SearchCall, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        // Google Search grounding has no domain filter: the allowed domains
        // go into the instruction, and the caller keeps only results from
        // them (checked against the grounding metadata below).
        systemInstruction: { parts: [{ text: `${system}\n\nИскать только на сайтах: ${allowedDomains.join(', ')}.` }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0, maxOutputTokens: 8192 },
      }),
    })
  } catch {
    throw new InspectionError(503, 'ai_unavailable', 'Gemini API is unreachable')
  }
  if (!res.ok) {
    const body = await res.text()
    if (res.status === 429) throw new InspectionError(503, 'ai_busy', `Gemini quota reached: ${body}`)
    throw new InspectionError(502, 'ai_unavailable', `Gemini API error ${res.status}: ${body}`)
  }
  const data = await res.json()
  const candidate = data?.candidates?.[0]
  const finalText: string = (candidate?.content?.parts ?? [])
    .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
    .map((p: { text: string }) => p.text)
    .join('')
  // Grounding chunks: `uri` is a Google redirect, `title` is the site's domain.
  const seen = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .map((c: { web?: { uri?: string; title?: string } }) => ({ url: c.web?.uri ?? '', title: c.web?.title ?? '' }))
    .filter((s: { url: string }) => s.url)
  return { text: finalText, seen }
}

// ---- Gemini ----------------------------------------------------------------

/** JSON Schema -> Gemini's OpenAPI subset (upper-case types, no additionalProperties). */
function toGeminiSchema(schema: any): any {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema)
  if (!schema || typeof schema !== 'object') return schema
  const out: any = {}
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'additionalProperties' || key === 'description') continue
    if (key === 'type') out.type = String(value).toUpperCase()
    else if (key === 'properties') {
      out.properties = Object.fromEntries(Object.entries(value as object).map(([k, v]) => [k, toGeminiSchema(v)]))
      out.propertyOrdering = Object.keys(value as object)
    } else out[key] = toGeminiSchema(value)
  }
  return out
}

// Reasons Gemini stops without (usable) output because of its content filters.
const BLOCKED_FINISH_REASONS = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY'])

async function callGemini({ system, parts, schema, maxTokens }: ModelCall, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      // Key in a header rather than the URL, so it never appears in logs.
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          {
            role: 'user',
            parts: parts.map((p) =>
              p.type === 'text' ? { text: p.text } : { inline_data: { mime_type: p.mediaType, data: p.data } },
            ),
          },
        ],
        generationConfig: {
          temperature: 0, // an inspector should be consistent, not creative
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json',
          responseSchema: toGeminiSchema(schema),
        },
      }),
    })
  } catch {
    throw new InspectionError(503, 'ai_unavailable', 'Gemini API is unreachable')
  }

  if (!res.ok) {
    const body = await res.text()
    if (res.status === 429) throw new InspectionError(503, 'ai_busy', `Gemini quota reached: ${body}`)
    if (res.status === 401 || res.status === 403) throw new InspectionError(500, 'config_error', 'GEMINI_API_KEY is missing or invalid')
    if (res.status === 400) throw new InspectionError(422, 'image_rejected', `Gemini rejected the request: ${body}`)
    throw new InspectionError(502, 'ai_unavailable', `Gemini API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  if (data?.promptFeedback?.blockReason) {
    throw new InspectionError(422, 'refused', `Gemini blocked the request: ${data.promptFeedback.blockReason}`)
  }
  const candidate = data?.candidates?.[0]
  const finishReason: string | undefined = candidate?.finishReason
  if (finishReason && BLOCKED_FINISH_REASONS.has(finishReason)) {
    throw new InspectionError(422, 'refused', `Gemini stopped: ${finishReason}`)
  }
  if (finishReason === 'MAX_TOKENS') throw new InspectionError(502, 'truncated', 'The model output was cut off')

  const text: string = (candidate?.content?.parts ?? [])
    .filter((part: { text?: string; thought?: boolean }) => part.text && !part.thought)
    .map((part: { text: string }) => part.text)
    .join('')
  try {
    return { json: JSON.parse(text), model: data?.modelVersion || GEMINI_MODEL }
  } catch {
    throw new InspectionError(502, 'bad_response', 'Gemini returned malformed JSON')
  }
}
