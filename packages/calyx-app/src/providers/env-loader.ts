/**
 * Environment variable injection from auth storage.
 *
 * Reads stored API keys from `~/.local/share/calyx/auth.json` and maps them
 * to the correct `process.env` variable names using cached provider metadata
 * from models.dev.
 *
 * Mapping logic:
 * 1. Read auth.json to get stored API keys per provider.
 * 2. Read cached providers.json to get env variable names for each provider.
 * 3. Set `process.env[envVar] = apiKey` for each configured provider.
 *
 * Example: `deepseek` → `DEEPSEEK_API_KEY`
 *
 * Core-safe: no `solid-js`, no UI coupling, no Bun-only APIs.
 * Uses only Node standard APIs.
 */

import { readAuth } from '@/auth/index.ts'
import { Logger } from '@/logging/logger.ts'
import { getCachedProviders } from '@/providers/models-api.ts'

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
 * Replace the logger instance used by env-loader.
 *
 * Call this once during application bootstrap to inject a shared logger
 * with your preferred configuration.
 */
export function setEnvLoaderLogger(logger: Logger): void {
  _logger = logger
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load API keys from auth storage into `process.env`.
 *
 * For each provider that has a stored API key:
 * - Looks up the provider's env variable names from cached provider metadata.
 * - Identifies the `API_KEY` (or `api_key`) env var for that provider.
 * - Sets it on `process.env` *only if not already set* (preserves user overrides).
 *
 * Failures are silently swallowed — the caller will get an error from the AI
 * SDK when the keys are actually needed if loading failed.
 */
export async function loadApiKeysToEnv(): Promise<void> {
  const log = getLogger()

  try {
    await log.debug('Loading API keys to environment')

    // Read stored API keys
    const auth = await readAuth()

    // If no providers configured, skip
    if (Object.keys(auth).length === 0) {
      await log.debug('No API keys configured, skipping env loading')
      return
    }

    await log.debug(`Found ${Object.keys(auth).length} configured provider(s)`)

    // Read provider metadata to get env variable names
    const cachedProviders = await getCachedProviders()

    if (!cachedProviders) {
      // No cached providers data — cannot determine env var names
      // Silently skip — user will get error when trying to use LLM
      await log.debug('No cached providers data found, skipping env loading')
      return
    }

    const providers = cachedProviders.data

    // Iterate through configured providers and set env vars
    let loadedCount = 0
    for (const [providerId, authData] of Object.entries(auth)) {
      const provider = providers[providerId]

      if (!provider || !provider.env) {
        await log.debug(`Provider '${providerId}' not found in cache or has no env vars`)
        continue
      }

      // Find the API key env variable (usually the first one or contains "API_KEY")
      const apiKeyEnvVar = provider.env.find((env) => env.includes('API_KEY') || env.includes('api_key')) ?? provider.env[0]

      if (apiKeyEnvVar) {
        // Only set if not already set in environment
        if (!process.env[apiKeyEnvVar]) {
          process.env[apiKeyEnvVar] = authData.apiKey
          await log.debug(`Set ${apiKeyEnvVar} for provider '${providerId}'`)
          loadedCount++
        } else {
          await log.debug(`Skipped ${apiKeyEnvVar} for provider '${providerId}' (already set)`)
        }
      }
    }

    await log.debug(`API keys loading complete: ${loadedCount} key(s) set`)
  } catch (err) {
    // Silently fail — don't break startup if loading keys fails
    // The user will get an error when trying to use the LLM if keys are missing
    await log.debug(`Failed to load API keys: ${err instanceof Error ? err.message : String(err)}`)
  }
}
