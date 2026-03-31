// ModelInfo is intentionally minimal (id + name + index signature) because the
// upstream calyx-flow `Model` type no longer exists. Consumers can refine via intersection.
export interface ModelInfo {
  id: string
  name: string
  [key: string]: unknown
}

export interface ProviderInfo {
  id: string
  name: string
  env: string[]
  npm: string
  api: string
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
