import { getProviderFactory } from '@/services/provider-factory.ts'
import { streamText } from 'ai'

export type Flow = {
  run: (prompt: string, options?: any) => ReturnType<typeof streamText>
}

export type FlowConfig = {}

export type FlowBuilder = {
  build: (config: FlowConfig) => Flow
}

export async function createFlowBuilder() {
  const providerId = 'deepseek'
  const modelId = 'deepseek-reasoner'
  const provider = await getProviderFactory(providerId)
  const model = provider.languageModel(modelId)
  const builder: FlowBuilder = {
    build() {
      const flow: Flow = {
        run: (prompt: string, options?: any) => {
          return streamText({
            model,
            prompt,
            ...options,
          })
        },
      }
      return flow
    },
  }
  return builder
}
