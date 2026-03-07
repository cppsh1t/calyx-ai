import { type LanguageModel } from 'ai'

//FIXME:查找包名有问题，只限定了这几次，应该按package循环找
//参数传递也有问题，后面修，需要函数参数上传递一个完整的配置json过来

/**
 * Configuration mapping for AI provider packages and their factory functions
 * Maps provider IDs to their @ai-sdk package and factory function name
 */
const PROVIDER_CONFIG: Record<
  string,
  {
    package: string
    factory: string
  }
> = {
  // Core providers
  anthropic: { package: '@ai-sdk/anthropic', factory: 'createAnthropic' },
  openai: { package: '@ai-sdk/openai', factory: 'createOpenAI' },
  google: { package: '@ai-sdk/google', factory: 'createGoogleGenerativeAI' },
  azure: { package: '@ai-sdk/azure', factory: 'createAzure' },

  // Popular third-party providers
  deepseek: { package: '@ai-sdk/deepseek', factory: 'createDeepSeek' },
  groq: { package: '@ai-sdk/groq', factory: 'createGroq' },
  mistral: { package: '@ai-sdk/mistral', factory: 'createMistral' },
  cohere: { package: '@ai-sdk/cohere', factory: 'createCohere' },
  xai: { package: '@ai-sdk/xai', factory: 'createXai' },

  // Specialized providers
  cerebras: { package: '@ai-sdk/cerebras', factory: 'createCerebras' },
  deepinfra: { package: '@ai-sdk/deepinfra', factory: 'createDeepInfra' },
  gateway: { package: '@ai-sdk/gateway', factory: 'createGateway' },
  'google-vertex': { package: '@ai-sdk/google-vertex', factory: 'createVertex' },
  perplexity: { package: '@ai-sdk/perplexity', factory: 'createPerplexity' },
  togetherai: { package: '@ai-sdk/togetherai', factory: 'createTogetherAI' },
  vercel: { package: '@ai-sdk/vercel', factory: 'createVercel' },
  'openai-compatible': { package: '@ai-sdk/openai-compatible', factory: 'createOpenAICompatible' },
  // 'moonshotai-cn': { package: '@ai-sdk/openai-compatible', factory: 'createOpenAICompatible' }
}

export type ProviderInstance = { languageModel: (modelId: string) => LanguageModel }
export type RawProviderFactory = (options?: any) => ProviderInstance

/**
 * Module-level cache for provider factory instances
 * Maps providerId to the initialized provider instance
 */
const factoryCache = new Map<string, ProviderInstance>()

/**
 * Get or create a provider factory instance with caching
 * @param providerId - The provider identifier (e.g., 'deepseek', 'anthropic')
 * @returns The provider instance that can create model instances
 * @throws Error if provider is not supported or API key is missing
 */
export async function getProviderFactory(providerId: string): Promise<ProviderInstance> {
  // Check cache first
  if (factoryCache.has(providerId)) {
    return factoryCache.get(providerId)!
  }

  // Validate provider exists
  const config = PROVIDER_CONFIG[providerId]
  if (!config) {
    throw new Error(`Unsupported provider: ${providerId}`)
  }

  // Dynamic import of the provider package
  const providerModule = await import(config.package)
  const factory = providerModule[config.factory] as RawProviderFactory | undefined

  if (typeof factory !== 'function') {
    throw new Error(`Provider factory '${config.factory}' not found in ${config.package}`)
  }

  // Create provider instance with API key
  // const provider = factory({
  //   baseURL: config
  // })

  const provider = factory({})

  // Cache the provider instance
  factoryCache.set(providerId, provider)

  return provider
}

/**
 * Clear the provider factory cache
 * Useful for testing or when API keys change
 */
export function clearProviderCache(): void {
  factoryCache.clear()
}

/**
 * Get list of supported provider IDs
 * @returns Array of supported provider IDs
 */
export function getSupportedProviders(): string[] {
  return Object.keys(PROVIDER_CONFIG)
}

/**
 * Check if a provider is supported
 * @param providerId - The provider identifier to check
 * @returns true if the provider is supported
 */
export function isProviderSupported(providerId: string): boolean {
  return providerId in PROVIDER_CONFIG
}
