import { streamText } from 'ai'
import { getProviderKey } from '@/utils/auth.ts'
import { deepseek } from '@ai-sdk/deepseek'

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
  return streamText({
    model: deepseek(modelId),
    prompt: message
  })
}