import type { Provider, RawProviderFactory } from '@/types/services/provider-factory.ts'

const factoryMethodMap = {
  // Core providers
  '@ai-sdk/anthropic': 'createAnthropic',
  '@ai-sdk/openai': 'createOpenAI',
  '@ai-sdk/google': 'createGoogleGenerativeAI',
  '@ai-sdk/azure': 'createAzure',

  // Popular third-party providers
  '@ai-sdk/deepseek': 'createDeepSeek',
  '@ai-sdk/groq': 'createGroq',
  '@ai-sdk/mistral': 'createMistral',
  '@ai-sdk/cohere': 'createCohere',
  '@ai-sdk/xai': 'createXai',

  // Specialized providers
  '@ai-sdk/cerebras': 'createCerebras',
  '@ai-sdk/deepinfra': 'createDeepInfra',
  '@ai-sdk/gateway': 'createGateway',
  '@ai-sdk/google-vertex': 'createVertex',
  '@ai-sdk/perplexity': 'createPerplexity',
  '@ai-sdk/togetherai': 'createTogetherAI',
  '@ai-sdk/vercel': 'createVercel',
  '@ai-sdk/openai-compatible': 'createOpenAICompatible',
}

export function buildProviderFactory(config: Record<string, Provider>) {
  const providerFactory = {
    async makeProvider(providerId: string) {
      const providerConfig = config[providerId]
      if (!providerConfig) {
        throw new Error(`Unsupported provider: ${providerId}`)
      }
      const providerModule = await import(providerConfig!.npm)

      const fatoryMethodName = factoryMethodMap[providerConfig!.npm as keyof typeof factoryMethodMap]

      if (!fatoryMethodName) {
        throw new Error(`Provider factory method not found`)
      }

      const factory = providerModule[fatoryMethodName] as RawProviderFactory | undefined

      if (typeof factory !== 'function') {
        throw new Error(`Provider factory '${fatoryMethodName}' not found in ${providerConfig!.name}`)
      }

      const provider = factory({
        baseURL: providerConfig!.api,
        apiKey: process.env[providerConfig.env[0] as string],
      })
      return provider
    },
  }
  return providerFactory
}
