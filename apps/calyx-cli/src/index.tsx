#!/usr/bin/env bun
import { parseCli } from '@/utils/cli.ts'
import { ensureCacheDir, initUserConfig } from '@/utils/config.ts'
import { loadApiKeysToEnv } from '@/utils/env-loader.ts'
import { handleError } from '@/utils/error-handler.ts'
import { getProviders } from '@/utils/models-api.ts'
import { Router } from '@/views/router.tsx'
import { render } from '@opentui/solid'

try {
  await initUserConfig()
  await ensureCacheDir()

  // Pre-fetch providers from models.dev and cache locally
  // This runs in the background and won't block startup
  getProviders().catch(() => {
    // Silently fail - cache will be retried on next startup
    // loadApiKeysToEnv() will handle the case where cache doesn't exist yet
  })

  await loadApiKeysToEnv()
  const result = await parseCli(process.argv)

  // Check if running in a TTY environment
  // OpenTUI requires a terminal to function properly
  if (!process.stdout.isTTY) {
    console.error('Error: Calyx CLI requires a TTY environment to run.')
    console.error('Please run in a proper terminal (not CI/non-interactive).')
    process.exit(1)
  }

  // Only render TUI if no subcommand was executed (e.g., init, help, etc.)
  if (result.shouldRenderTUI && result.parsedConfig) {
    const config = result.parsedConfig
    // Render Router directly (ErrorBoundary not supported in OpenTUI)
    // Error handling is managed by the Router's error view
    // OpenTUI handles cleanup via exitOnCtrlC option

    render(() => <Router config={config} />, {
      exitOnCtrlC: true,
    })
  }
} catch (error) {
  // Catch async errors that happen before render
  handleError(error, { context: 'initialization' })
}
