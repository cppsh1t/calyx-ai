import type { CachedProviders, ProvidersResponse } from '@/types/providers.ts'
import { CACHE_DIR, ensureCacheDir } from '@/utils/config.ts'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Path to the providers cache file
 */
const PROVIDERS_CACHE_FILE = join(CACHE_DIR, 'providers.json')

/**
 * models.dev API endpoint
 */
const MODELS_DEV_URL = 'https://models.dev/api.json'

/**
 * Cache duration in milliseconds (5 hours)
 * Note: We use cache regardless of age on network failure
 */
const CACHE_DURATION_MS = 5 * 60 * 60 * 1000 // 5 hours

/**
 * Fetch providers from models.dev API
 * On success: cache to file and return data
 * On failure: throw error (caller should use getCachedProviders)
 * @returns ProvidersResponse object
 */
export async function fetchProviders(): Promise<ProvidersResponse> {
  const response = await fetch(MODELS_DEV_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch providers: ${response.status} ${response.statusText}`)
  }
  const data = (await response.json()) as ProvidersResponse

  // Cache the data
  await cacheProviders(data)

  return data
}

/**
 * Get cached providers from disk
 * @returns CachedProviders if file exists and is valid, null otherwise
 */
export async function getCachedProviders(): Promise<CachedProviders | null> {
  try {
    const content = await readFile(PROVIDERS_CACHE_FILE, 'utf-8')
    return JSON.parse(content) as CachedProviders
  } catch {
    return null
  }
}

/**
 * Cache providers data to disk
 * @param data - Providers data to cache
 */
export async function cacheProviders(data: ProvidersResponse): Promise<void> {
  await ensureCacheDir()
  const cacheData: CachedProviders = {
    data,
    timestamp: Date.now(),
  }
  await writeFile(PROVIDERS_CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf-8')
}

/**
 * Check if cached data is stale (older than 5 hours)
 * Note: This is informational only - we use cache regardless of age on failure
 * @param cached - Cached providers data
 * @returns true if cache is older than 5 hours
 */
export function isCacheStale(cached: CachedProviders): boolean {
  return Date.now() - cached.timestamp > CACHE_DURATION_MS
}

/**
 * Get providers with fallback logic
 * 1. Try to fetch from models.dev
 * 2. On failure: return cached data (any age)
 * 3. If no cache: return empty object
 * @returns ProvidersResponse object
 */
export async function getProviders(): Promise<ProvidersResponse> {
  try {
    return await fetchProviders()
  } catch {
    // Network failure - try cache
    const cached = await getCachedProviders()
    if (cached) {
      return cached.data
    }
    // No cache available - return empty
    return {}
  }
}
