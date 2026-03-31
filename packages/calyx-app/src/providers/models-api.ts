/**
 * Provider fetch / cache / TTL / fallback logic.
 *
 * Fetches the models.dev provider catalogue, caches it to disk with a 5-hour
 * TTL, and falls back to stale cache on network failure.
 *
 * Core-safe: no `solid-js`, no UI coupling, no Bun-only APIs.
 */

import { CACHE_DIR, ensureCacheDir } from '@/config/config.ts'
import { Logger } from '@/logging/logger.ts'
import type { CachedProviders, ProvidersResponse } from '@/types/providers.ts'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Path to the providers cache file on disk. */
const PROVIDERS_CACHE_FILE = join(CACHE_DIR, 'providers.json')

/** models.dev API endpoint. */
const MODELS_DEV_URL = 'https://models.dev/api.json'

/**
 * Cache duration in milliseconds (5 hours).
 *
 * Stale cache is *still* used as a fallback when the network request fails —
 * this TTL is informational only (e.g. for UI badges).
 */
const CACHE_DURATION_MS = 5 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Internal logger (lazy singleton)
// ---------------------------------------------------------------------------

let _logger: Logger | undefined

function getLogger(): Logger {
  if (!_logger) {
    _logger = new Logger({ autoCleanup: false })
  }
  return _logger
}

/**
 * Replace the logger instance used by models-api.
 *
 * Call this once during application bootstrap to inject a shared logger
 * with your preferred configuration.
 */
export function setModelsApiLogger(logger: Logger): void {
  _logger = logger
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch providers from the models.dev API.
 *
 * On success the response is cached to disk and returned.
 * On failure the error is re-thrown — callers should use {@link getProviders}
 * or {@link getCachedProviders} for automatic fallback.
 */
export async function fetchProviders(): Promise<ProvidersResponse> {
  const log = getLogger()

  log.debug('Fetching providers from models.dev')
  const response = await fetch(MODELS_DEV_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch providers: ${response.status} ${response.statusText}`)
  }
  const data = (await response.json()) as ProvidersResponse

  await cacheProviders(data)
  return data
}

/**
 * Read cached providers from disk.
 *
 * @returns Parsed cache if the file exists and contains valid JSON, otherwise `null`.
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
 * Write providers data to the on-disk cache.
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
 * Check whether a cached entry is stale (older than 5 hours).
 *
 * This is informational only — stale cache is *still* used as a fallback
 * when the network request fails.
 */
export function isCacheStale(cached: CachedProviders): boolean {
  return Date.now() - cached.timestamp > CACHE_DURATION_MS
}

/**
 * Get providers with automatic fallback logic:
 *
 * 1. Try to fetch fresh data from models.dev.
 * 2. On network failure → return cached data (any age).
 * 3. If no cache is available → return an empty object.
 */
export async function getProviders(): Promise<ProvidersResponse> {
  const log = getLogger()

  try {
    return await fetchProviders()
  } catch (err) {
    // Network failure — fall back to cache
    const cached = await getCachedProviders()
    if (cached) {
      log.debug('Network fetch failed, using cached providers', {
        stale: isCacheStale(cached),
      })
      return cached.data
    }
    log.debug('Network fetch failed and no cache available')
    return {}
  }
}
