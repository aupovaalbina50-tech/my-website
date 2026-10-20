// Model call for «Рапортты құрастыру».
//
// With ANTHROPIC_API_KEY set, the shared doc-inspector call (Claude) is used
// as is. Otherwise the report uses its OWN Gemini model: the site-wide
// GEMINI_MODEL secret is a lite model chosen for the chat assistant, while
// composing and proof-reading a report needs a stronger one. If that model
// is unavailable (quota, unknown name), the call falls back to the shared
// one, so the tool keeps working. The expertise and the chat are unaffected.
//
//   supabase secrets set SMART_REPORT_GEMINI_MODEL=<model>   (default gemini-flash-latest)
//
// Speed: flash models «think» before answering, and by default that thinking
// is unbounded — a plain extraction then took most of a minute. Each step
// sets its own budget (`thinkingBudget`, tokens): 0 for extracting facts, a
// small one for composing and proof-reading.

import { callModel, InspectionError, type ModelCall } from '../doc-inspector/llm.ts'

const REPORT_GEMINI_MODEL = Deno.env.get('SMART_REPORT_GEMINI_MODEL') || 'gemini-flash-latest'

// Same conversion as the shared call: Gemini's responseSchema has upper-case
// types and no additionalProperties / description.
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

export type ReportModelCall = ModelCall & { thinkingBudget?: number }

// The platform stops a function after ~150 s; a slow answer is dropped well
// before that, so the shared model still has time to answer instead.
const REPORT_MODEL_TIMEOUT_MS = 60000

const post = (apiKey: string, body: unknown) =>
  fetch(`https://generativelanguage.googleapis.com/v1beta/models/${REPORT_GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REPORT_MODEL_TIMEOUT_MS),
  })

/** One attempt on the report's own Gemini model; null = try the shared model instead. */
async function callReportGemini({ system, parts, schema, maxTokens, thinkingBudget }: ReportModelCall, apiKey: string) {
  const generationConfig: Record<string, unknown> = {
    temperature: 0,
    maxOutputTokens: maxTokens,
    responseMimeType: 'application/json',
    responseSchema: toGeminiSchema(schema),
  }
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: parts.filter((p) => p.type === 'text').map((p) => ({ text: (p as { text: string }).text })) }],
    generationConfig: thinkingBudget === undefined ? generationConfig : { ...generationConfig, thinkingConfig: { thinkingBudget } },
  }
  let res: Response
  try {
    res = await post(apiKey, body)
    // A model that does not accept this thinking budget: once more without it.
    if (res.status === 400 && thinkingBudget !== undefined) res = await post(apiKey, { ...body, generationConfig })
  } catch {
    return null
  }
  if (!res.ok) {
    console.warn(`smart-report: ${REPORT_GEMINI_MODEL} unavailable (${res.status}), falling back to the shared model`)
    return null
  }
  const data = await res.json().catch(() => null)
  if (!data) return null
  if (data?.promptFeedback?.blockReason) throw new InspectionError(422, 'refused', `Gemini blocked the request: ${data.promptFeedback.blockReason}`)
  const candidate = data?.candidates?.[0]
  if (candidate?.finishReason === 'MAX_TOKENS') throw new InspectionError(502, 'truncated', 'The model output was cut off')
  const text: string = (candidate?.content?.parts ?? [])
    .filter((part: { text?: string; thought?: boolean }) => part.text && !part.thought)
    .map((part: { text: string }) => part.text)
    .join('')
  try {
    return { json: JSON.parse(text), model: data?.modelVersion || REPORT_GEMINI_MODEL }
  } catch {
    return null
  }
}

export async function callReportModel({ thinkingBudget, ...call }: ReportModelCall): Promise<{ json: any; model: string }> {
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!Deno.env.get('ANTHROPIC_API_KEY') && geminiKey) {
    const result = await callReportGemini({ ...call, thinkingBudget }, geminiKey)
    if (result) return result
  }
  return callModel(call)
}
