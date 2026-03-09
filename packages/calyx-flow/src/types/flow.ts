import type { streamText } from 'ai'

/**
 * Message type definition
 */
export type Message = { role: string; content: string }

/**
 * Flow runtime instance
 */
export type Flow = {
  run: (messages: Message[], options?: any) => ReturnType<typeof streamText>
}

/**
 * Flow configuration options
 */
export type FlowConfig = {
  providerId: string
  modelId: string
}

/**
 * Flow builder
 */
export type FlowBuilder = {
  build: (config: FlowConfig) => Promise<Flow>
}
