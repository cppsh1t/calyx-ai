import { streamText } from "ai"
import { getProviderFactory } from "../services/provider-factory"
import { isEmpty } from 'radash'

export type Flow = {
  run: (prompt: string, options?: any) => ReturnType<typeof streamText>
}

export type FlowConfig = {
  
}

export type FlowBuilder = {
  build: (config: FlowConfig) => Flow
}

type ApiKeyGetter = (providerId: string) => (Promise<string | undefined>) | (string | undefined)

export async function createFlowBuilder(apiKeyGetter: ApiKeyGetter) {
  const providerId = 'deepseek'
  const modelId = 'deepseek-reasoner'
  const apiKey = await apiKeyGetter(providerId)
  if (isEmpty(apiKey)) {
    throw new Error('Api key not found')
  }
  const provider = await getProviderFactory(providerId, apiKey as string)
  const model = provider.languageModel(modelId)
  const builder: FlowBuilder = {
    build() {
      const flow: Flow = {
        run: (prompt: string, options?: any) => {
        return streamText({
          model,
          prompt,
          ...options
        })
      }
      }
      return flow
    },
  }
  return builder
}