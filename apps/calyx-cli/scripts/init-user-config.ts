#!/usr/bin/env bun
/**
 * Post-install script for initializing user configuration
 * Automatically runs after `bun install` to create ~/.calyx/models.json
 * Skips execution in CI/non-interactive environments
 */

import { initUserConfig } from '@/utils/config.ts'

/**
 * Main script execution
 */
async function main(): Promise<void> {
  try {
    // Additional CI check at script level for early exit
    const isCI = process.env.CI === 'true' || process.env.CI === '1'
    if (isCI) {
      console.log('Skipping user config initialization in CI environment')
      process.exit(0)
    }

    // Initialize user config (idempotent - safe to run multiple times)
    const _configPath = await initUserConfig()

    // Success message (initUserConfig already logs when config is created)
    // If we reach here without seeing the "Created" message, config already existed
    console.log('✓ User configuration check complete')
  } catch (error) {
    // Graceful error handling - don't fail installation
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Warning: Failed to initialize user config: ${message}`)
    console.error('You can manually create ~/.calyx/models.json later')
    process.exit(0) // Exit with success even on failure
  }
}

// Execute main function
await main()
