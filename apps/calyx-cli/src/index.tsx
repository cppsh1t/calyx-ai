#!/usr/bin/env bun
import { parseCli } from '@/utils/cli.ts'
import { initUserConfig } from '@/utils/config.ts'
import { handleError } from '@/utils/error-handler.ts'
import { Router } from '@/views/router.tsx'
import { createCliRenderer } from '@opentui/core'
import { render } from '@opentui/solid'
import { useRenderer } from 'node_modules/@opentui/solid/dist'

try {
  await initUserConfig()
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
