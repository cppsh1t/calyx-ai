import { readAuth } from '@/utils/auth.ts'
import { logger } from '@/utils/logger.ts'
import { getCachedProviders } from '@/utils/models-api.ts'

/**
 * Load API keys from auth storage and set them as environment variables
 * This allows the ai SDK to automatically pick up the keys when using provider/model format
 *
 * Mapping logic:
 * 1. Read auth.json to get stored API keys per provider
 * 2. Read cached providers.json to get env variable names for each provider
 * 3. Set process.env[envVar] = apiKey for each configured provider
 *
 * Example: deepseek -> DEEPSEEK_API_KEY
 */
export async function loadApiKeysToEnv(): Promise<void> {
  try {
    await logger.debug('Loading API keys to environment')

    // Read stored API keys
    const auth = await readAuth()

    // If no providers configured, skip
    if (Object.keys(auth).length === 0) {
      await logger.debug('No API keys configured, skipping env loading')
      return
    }

    await logger.debug(`Found ${Object.keys(auth).length} configured provider(s)`)

    // Read provider metadata to get env variable names
    const cachedProviders = await getCachedProviders()

    if (!cachedProviders) {
      // No cached providers data - cannot determine env var names
      // Silently skip - user will get error when trying to use LLM
      await logger.debug('No cached providers data found, skipping env loading')
      return
    }

    const providers = cachedProviders.data

    // Iterate through configured providers and set env vars
    let loadedCount = 0
    for (const [providerId, authData] of Object.entries(auth)) {
      const provider = providers[providerId]

      if (!provider || !provider.env) {
        // Provider not found in cache or no env vars defined
        await logger.debug(`Provider '${providerId}' not found in cache or has no env vars`)
        continue
      }

      // Find the API key env variable (usually the first one or contains "API_KEY")
      const apiKeyEnvVar = provider.env.find((env) => env.includes('API_KEY') || env.includes('api_key')) || provider.env[0]

      if (apiKeyEnvVar) {
        // Only set if not already set in environment
        if (!process.env[apiKeyEnvVar]) {
          process.env[apiKeyEnvVar] = authData.apiKey
          await logger.debug(`Set ${apiKeyEnvVar} for provider '${providerId}'`)
          loadedCount++
        } else {
          await logger.debug(`Skipped ${apiKeyEnvVar} for provider '${providerId}' (already set)`)
        }
      }

      // Also set other env vars if they exist (like API_BASE) and are not set
      // Skip API_KEY vars as we already handled the main one
      for (const envVar of provider.env) {
        if (envVar !== apiKeyEnvVar && !process.env[envVar]) {
          // For now, we only auto-set API_KEY vars
          // Other vars like API_BASE would need user configuration
          // This can be extended later if needed
        }
      }
    }

    await logger.debug(`API keys loading complete: ${loadedCount} key(s) set`)
  } catch (err) {
    // Silently fail - don't break CLI startup if loading keys fails
    // The user will get an error when trying to use the LLM if keys are missing
    await logger.debug(`Failed to load API keys: ${err instanceof Error ? err.message : String(err)}`)
  }
}
