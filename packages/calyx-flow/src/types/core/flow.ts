import type { LanguageModelUsage } from 'ai'

export type OriginMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type UserMessage = { role: 'user'; wrapperContent: string; displayContent: string }

export type AssistantMessage = {
  role: 'assistant'
  wrapperContent: string
  displayContent: string
  reasonContent?: string
  usage: LanguageModelUsage | null
}

export type Message = UserMessage | AssistantMessage

export type PendingMessageType = 'thought' | 'action' | 'observation' | 'answer' | 'reason'

export type PendingMessage = {
  type: PendingMessageType
  content: string
}

export type Flow = {
  run: () => Promise<IteratorResult<Message>>
}

export type Tool = {}

export type FlowConfig = {
  providerId: string
  modelId: string
  systemPrompt: string
  tools?: Tool[]
  history?: Message[]
}

export type FlowBuilder = {
  build: (config: FlowConfig) => Promise<Flow>
}
