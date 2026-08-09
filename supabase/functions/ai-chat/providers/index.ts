import type { Provider } from './types.ts'
import { generate as geminiGenerate } from './gemini.ts'
import { generate as groqGenerate } from './groq.ts'
import { generate as openrouterGenerate } from './openrouter.ts'

interface ProviderConfig {
  generate: Provider
  apiKeyEnv: string
  defaultModel: string
  modelEnv: string
}

// Add a new provider by dropping a file here and registering it below —
// nothing else in the function needs to change.
const PROVIDERS: Record<string, ProviderConfig> = {
  gemini: {
    generate: geminiGenerate,
    apiKeyEnv: 'GEMINI_API_KEY',
    defaultModel: 'gemini-flash-latest',
    modelEnv: 'GEMINI_MODEL',
  },
  groq: {
    generate: groqGenerate,
    apiKeyEnv: 'GROQ_API_KEY',
    defaultModel: 'llama-3.1-8b-instant',
    modelEnv: 'GROQ_MODEL',
  },
  openrouter: {
    generate: openrouterGenerate,
    apiKeyEnv: 'OPENROUTER_API_KEY',
    defaultModel: 'meta-llama/llama-3.1-8b-instruct:free',
    modelEnv: 'OPENROUTER_MODEL',
  },
}

export function resolveProvider() {
  const name = (Deno.env.get('AI_PROVIDER') || 'gemini').toLowerCase()
  const config = PROVIDERS[name]
  if (!config) {
    throw new Error(`Unknown AI_PROVIDER "${name}". Valid options: ${Object.keys(PROVIDERS).join(', ')}`)
  }

  const apiKey = Deno.env.get(config.apiKeyEnv)
  if (!apiKey) {
    throw new Error(`Missing secret ${config.apiKeyEnv}. Set it with: supabase secrets set ${config.apiKeyEnv}=...`)
  }

  const model = Deno.env.get(config.modelEnv) || config.defaultModel

  return { name, generate: config.generate, apiKey, model }
}
