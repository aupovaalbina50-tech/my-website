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

export interface ResolvedProvider {
  name: string
  generate: Provider
  apiKey: string
  model: string
}

function resolveOne(name: string): ResolvedProvider | null {
  const config = PROVIDERS[name]
  if (!config) return null
  const apiKey = Deno.env.get(config.apiKeyEnv)
  if (!apiKey) return null
  const model = Deno.env.get(config.modelEnv) || config.defaultModel
  return { name, generate: config.generate, apiKey, model }
}

/**
 * Returns every configured provider (has a secret set) as a fallback chain,
 * preferred one first. AI_PROVIDER picks which one goes first — the rest
 * follow in their declared order so a quota/outage on the primary provider
 * doesn't take the whole assistant down.
 */
export function resolveProviderChain(): ResolvedProvider[] {
  const preferred = (Deno.env.get('AI_PROVIDER') || 'gemini').toLowerCase()
  const order = [preferred, ...Object.keys(PROVIDERS).filter((n) => n !== preferred)]

  const chain = order.map(resolveOne).filter((p): p is ResolvedProvider => p !== null)

  if (chain.length === 0) {
    const tried = Object.values(PROVIDERS).map((c) => c.apiKeyEnv)
    throw new Error(`No AI provider is configured. Set one of these secrets: ${tried.join(', ')}`)
  }

  return chain
}
