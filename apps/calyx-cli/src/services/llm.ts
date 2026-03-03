import { streamText } from 'ai'
import { getProviderKey } from '@/utils/auth.ts'

/**
 * Stream a chat message using DeepSeek's reasoner model
 * @param userMessage - The user's message to send
 * @returns StreamTextResult with textStream property for iteration
 * @throws Error if DeepSeek API key is not configured
 */
export async function streamChat(userMessage: string) {

  return streamText({
    model: 'deepseek/deepseek-reasoner',
    prompt: userMessage,
  })
}
