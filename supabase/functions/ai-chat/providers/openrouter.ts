import type { GenerateParams } from './types.ts'
import { callOpenAiCompatible } from './openaiCompatible.ts'

// OpenRouter free models (id suffixed ":free"): https://openrouter.ai/keys
export function generate(params: GenerateParams): Promise<string> {
  return callOpenAiCompatible(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      'HTTP-Referer': 'https://civil-protection-terms.kz',
      'X-Title': 'Civil Protection Terminology Navigator — AI Assistant',
    },
    params,
  )
}
