import { serve, type Server } from 'bun'

let serverInstance: Server<unknown> | null = null

export interface HostOptions {
  /** Server port, defaults to 9745 */
  port?: number
  /** Enable development mode with HMR, defaults to true when NODE_ENV !== 'production' */
  development?: boolean
}

export interface HostResult {
  /** The URL where the server is running */
  url: string
  /** Stop the server */
  stop: () => void
}

/**
 * Internal: lazy load HTML module to avoid JSX transform during import
 */
async function loadDefaultHtml(): Promise<unknown> {
  const module = await import('./index.html')
  return module.default
}

/**
 * Start the test-wrapper server with built-in React app
 * @param options - Configuration options
 * @returns Object with server URL and stop function
 *
 * @example
 * ```typescript
 * const { url, stop } = await host({ port: 3000 });
 * console.log(`Server running at ${url}`);
 * // Later...
 * stop();
 * ```
 */
export async function host(options: HostOptions = {}): Promise<HostResult> {
  const { port = 9745, development = process.env.NODE_ENV !== 'production' } = options

  if (serverInstance) {
    throw new Error('Server is already running. Call stop() first.')
  }

  // Lazy load HTML to avoid JSX transform issues when importing this module
  const htmlModule = await loadDefaultHtml()

  serverInstance = serve({
    routes: {
      '/*': htmlModule as any,
    },
    port,
    development: development && {
      hmr: true,
      console: true,
    },
  })

  const url = serverInstance.url.toString()

  return {
    url,
    stop: () => {
      if (serverInstance) {
        serverInstance.stop()
        serverInstance = null
      }
    },
  }
}

/**
 * Stop the running server
 */
export function stop(): void {
  if (serverInstance) {
    serverInstance.stop()
    serverInstance = null
  }
}

/**
 * Check if the server is currently running
 */
export function isRunning(): boolean {
  return serverInstance !== null
}

export type { Server } from 'bun'
