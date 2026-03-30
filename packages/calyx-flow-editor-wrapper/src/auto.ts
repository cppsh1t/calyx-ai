import index from './index.html'
import { host } from './server.ts'

/**
 * Start server with default React app (auto-loaded HTML)
 * Use this for CLI mode or when you want to serve test-wrapper's built-in React app
 *
 * @example
 * ```typescript
 * import { hostAuto } from 'test-wrapper/auto'
 * const { url, stop } = await hostAuto({ port: 3000 })
 * ```
 */
export async function hostAuto(options: { port?: number; development?: boolean } = {}) {
  return host({ ...options, htmlModule: index })
}

// Also export stop and isRunning
export { isRunning, stop } from './server.ts'
