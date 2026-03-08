import { buildProviderFactory } from '@/services/provider-factory'
import type { Provider } from '@/types/services/provider-factory'
import { streamText } from 'ai'
import zod from 'zod'

type Message = { role: string, content: string }

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
  build: (config: FlowConfig) => Promise<Flow>
}

export async function createFlowBuilder(providerConfig: Record<string, Provider>): Promise<FlowBuilder> {
  const providerFactory = buildProviderFactory(providerConfig)

  const builder: FlowBuilder = {
    async build(config: FlowConfig) {
      config = flowConfigZod.parse(config)
      const provider = await providerFactory.makeProvider(config.providerId)
      const model = provider.languageModel(config.modelId)
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
