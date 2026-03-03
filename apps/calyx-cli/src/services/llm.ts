import { streamWithProvider } from '@/services/provider-factory.ts'
/**
 * Stream a chat message using DeepSeek's reasoner model
 * @param userMessage - The user's message to send
 * @returns StreamTextResult with textStream property for iteration
 * @throws Error if DeepSeek API key is not configured
 */
export async function streamChat(userMessage: string) {
  return useStreamCore('deepseek', 'deepseek-reasoner', userMessage)
}


export async function useStreamCore(providerId: string, modelId: string, message: string) {
  return streamWithProvider(providerId, modelId, message)
}