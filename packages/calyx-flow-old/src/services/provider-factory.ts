import type { Provider, RawProviderFactory } from '@/types/services/provider-factory.ts'
import * as anthropicProvider from '@ai-sdk/anthropic'
import * as azureProvider from '@ai-sdk/azure'
import * as cerebrasProvider from '@ai-sdk/cerebras'
import * as cohereProvider from '@ai-sdk/cohere'
import * as deepinfraProvider from '@ai-sdk/deepinfra'
import * as deepseekProvider from '@ai-sdk/deepseek'
import * as gatewayProvider from '@ai-sdk/gateway'
import * as googleProvider from '@ai-sdk/google'
import * as googleVertexProvider from '@ai-sdk/google-vertex'
import * as groqProvider from '@ai-sdk/groq'
import * as mistralProvider from '@ai-sdk/mistral'
import * as openaiProvider from '@ai-sdk/openai'
import * as openaiCompatibleProvider from '@ai-sdk/openai-compatible'
import * as perplexityProvider from '@ai-sdk/perplexity'
import * as togetheraiProvider from '@ai-sdk/togetherai'
import * as vercelProvider from '@ai-sdk/vercel'
import * as xaiProvider from '@ai-sdk/xai'

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

const providerModuleMap: Record<string, Record<string, unknown>> = {
  '@ai-sdk/anthropic': anthropicProvider,
  '@ai-sdk/openai': openaiProvider,
  '@ai-sdk/google': googleProvider,
  '@ai-sdk/azure': azureProvider,
  '@ai-sdk/deepseek': deepseekProvider,
  '@ai-sdk/groq': groqProvider,
  '@ai-sdk/mistral': mistralProvider,
  '@ai-sdk/cohere': cohereProvider,
  '@ai-sdk/xai': xaiProvider,
  '@ai-sdk/cerebras': cerebrasProvider,
  '@ai-sdk/deepinfra': deepinfraProvider,
  '@ai-sdk/gateway': gatewayProvider,
  '@ai-sdk/google-vertex': googleVertexProvider,
  '@ai-sdk/perplexity': perplexityProvider,
  '@ai-sdk/togetherai': togetheraiProvider,
  '@ai-sdk/vercel': vercelProvider,
  '@ai-sdk/openai-compatible': openaiCompatibleProvider,
}

export function buildProviderFactory(config: Record<string, Provider>) {
  const providerFactory = {
    async makeProvider(providerId: string) {
      const providerConfig = config[providerId]
      if (!providerConfig) {
        throw new Error(`Unsupported provider: ${providerId}`)
      }
      const providerModule = providerModuleMap[providerConfig.npm]

      if (!providerModule) {
        throw new Error(`Provider package not bundled: ${providerConfig.npm}`)
      }

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
