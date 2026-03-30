#!/usr/bin/env bun
/**
 * CLI entry point for test-wrapper
 * Run with: bun run dev
 */

import { host } from './server.ts'

async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 9745

  try {
    const { url, stop } = await host({ port })
    console.log(`🚀 Server running at ${url}`)

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down...')
      stop()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      stop()
      process.exit(0)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

main()
