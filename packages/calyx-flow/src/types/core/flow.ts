import type { LanguageModelUsage } from 'ai'
import zod from 'zod'

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

export type OriginPendingMessageType =
  | 'thought'
  | 'action'
  | 'observation'
  | 'answer'
  | 'reason'

export type OriginPendingMessage = {
  type: OriginPendingMessageType
  content: string
}

export type UsagePendingMessage = {
  type: 'usage',
  content: LanguageModelUsage | null
}

export type PendingMessage = UsagePendingMessage | OriginPendingMessage

export interface IFlow {
  run: () => AsyncGenerator<PendingMessage, void, void>
  getHistory: () => Message[]
}

export type Tool = {
  name: string
  description: string
  paramsSchema: string
  execute: (params: any) => any
}

export type ToolResult = {
  tool: string
  status: string
  error: Error | any | null
  result: any
}

export type ToolCall = {
  tool: string
  arguments: any
}

export const toolCallZod = zod.object({
  tool: zod.string(),
  arguments: zod.any()
})

export type FlowConfig = {
  providerId: string
  modelId: string
  systemPrompt: string
  tools?: Tool[]
  history?: Message[]
}

export type FlowBuilder = {
  build: (config: FlowConfig) => Promise<IFlow>
}
