/**
 * Model information from models.dev API
 */
export interface ModelInfo {
  id: string
  name: string
  description?: string
  context_length?: number
  max_output_tokens?: number
  input_modalities?: string[]
  output_modalities?: string[]
}

/**
 * Provider information from models.dev API
 * Each provider has an id, name, environment variable names, and models
 */
export interface ProviderInfo {
  id: string
  name: string
  env?: string[]
  npm?: string
  models: Record<string, ModelInfo>
}

/**
 * Full response from models.dev/api.json
 * Keys are provider IDs (anthropic, openai, google, etc.)
 */
export type ProvidersResponse = Record<string, ProviderInfo>

/**
 * Cached provider data structure stored on disk
 */
export interface CachedProviders {
  data: ProvidersResponse
  timestamp: number
  etag?: string
}

/**
 * Auth storage structure for ~/.local/share/calyx/auth.json
 * Keys are provider IDs, values contain API key and metadata
 */
export interface AuthStorage {
  [providerId: string]: {
    apiKey: string
    createdAt: number
    lastUsed?: number
  }
}

/**
 * Result returned by ProviderConnector dialog
 */
export interface ProviderConnectionResult {
  provider: string
  apiKey: string
}
