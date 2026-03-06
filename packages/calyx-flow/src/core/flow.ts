import { getProviderFactory } from '@/services/provider-factory.ts'
import { streamText } from 'ai'
import zod from 'zod'

export type Flow = {
  run: (prompt: string, options?: any) => ReturnType<typeof streamText>
}

export type FlowConfig = {
  providerId: string
  modelId: string
}

const flowConfigZod = zod.object({
  providerId: zod.string(),
  modelId: zod.string()
})

export type FlowBuilder = {
  build: () => Flow
}

export async function createFlowBuilder(config: FlowConfig): Promise<FlowBuilder> {
  config = flowConfigZod.parse(config)
  const provider = await getProviderFactory(config.providerId)
  const model = provider.languageModel(config.modelId)
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
