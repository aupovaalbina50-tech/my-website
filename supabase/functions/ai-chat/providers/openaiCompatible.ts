import type { GenerateParams } from './types.ts'

// Shared caller for OpenAI-compatible chat-completions APIs (Groq, OpenRouter).
export async function callOpenAiCompatible(
  endpoint: string,
  extraHeaders: Record<string, string>,
  { systemPrompt, messages, apiKey, model }: GenerateParams,
): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 2000,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('Provider returned an empty response')
  return text.trim()
}
