import { getProviderFactory } from '@/services/provider-factory.ts'
import { streamText } from 'ai'
import zod from 'zod'

type Message = {role: string, content: string}

export type Flow = {
  run: (messages: Message[], options?: any) => ReturnType<typeof streamText>
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
        run: (messages: Message[], options?: any) => {
          return streamText({
            model,
            messages,
            ...options,
          })
        },
      }
      return flow
    },
  }
  return builder
}
