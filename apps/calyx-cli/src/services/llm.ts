import { getProviderKey } from '@/utils/auth.ts'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

/**
 * Stream a chat message using DeepSeek's reasoner model
 * @param userMessage - The user's message to send
 * @returns StreamTextResult with textStream property for iteration
 * @throws Error if DeepSeek API key is not configured
 */
export async function streamChat(userMessage: string) {
  const apiKey = await getProviderKey('deepseek')

  if (!apiKey) {
    throw new Error('DeepSeek API key not found. Please run the CLI and configure your API key.')
  }

  const deepseek = createOpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey,
  })

  return streamText({
    model: deepseek('deepseek-reasoner'),
    prompt: userMessage,
  })
}
