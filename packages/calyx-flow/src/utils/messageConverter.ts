import type { Message, OriginMessage } from "@/types/core/flow";

export function convertComplexToSimple(message: Message): OriginMessage {
  return {role: message.role, content: message.displayContent}
}

export function convertComplexToSimpleBatch(messages: Message[]): OriginMessage[] {
  return messages.map(convertComplexToSimple)
}

export function formatHistory(systemPrompt: string, history?: Message[]): OriginMessage[] {
  history ??= []
  const newHistory = convertComplexToSimpleBatch(history)
  return [{role: 'system', content: systemPrompt}, ...newHistory]
}