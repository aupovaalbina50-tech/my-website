import type { GenerateParams } from './types.ts'
import { callOpenAiCompatible } from './openaiCompatible.ts'

// Groq free tier: https://console.groq.com/keys
export function generate(params: GenerateParams): Promise<string> {
  return callOpenAiCompatible('https://api.groq.com/openai/v1/chat/completions', {}, params)
}
