import { buildProviderFactory } from '@/services/provider-factory.ts'
import type { Flow, FlowBuilder, FlowConfig, Message } from '@/types/flow.ts'
import type { Provider } from '@/types/services/provider-factory.ts'
import { streamText } from 'ai'
import zod from 'zod'

const flowConfigZod = zod.object({
  providerId: zod.string(),
  modelId: zod.string(),
})

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
