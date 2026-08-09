export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface GenerateParams {
  systemPrompt: string
  messages: ChatMessage[]
  apiKey: string
  model: string
}

export type Provider = (params: GenerateParams) => Promise<string>
