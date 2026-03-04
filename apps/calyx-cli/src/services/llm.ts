import { streamWithProvider } from '@/services/provider-factory.ts'
/**
 * Stream a chat message using DeepSeek's reasoner model
 * @param userMessage - The user's message to send
 * @returns StreamTextResult with textStream property for iteration
 */
export async function streamChat(userMessage: string) {
  return streamWithProvider('deepseek', 'deepseek-reasoner', userMessage)
}