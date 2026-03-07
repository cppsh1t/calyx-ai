import { logger } from '@/utils/logger'

interface HandleErrorOptions {
  router?: { setError: (e: Error) => void }
  exitCode?: number
  context?: string
}

/**
 * Unified error handling function that supports both UI navigation and process exit.
 *
 * - With router: Navigates to error view via router.setError()
 * - Without router: Logs to console and calls process.exit()
 *
 * @param error - The error to handle (can be any type)
 * @param options - Optional configuration for error handling
 */
export async function handleError(error: unknown, options: HandleErrorOptions = {}): Promise<void> {
  const { router, exitCode = 1, context } = options

  // Convert unknown to Error object
  const errorObj = error instanceof Error ? error : new Error(String(error))

  // Log the error
  logger.error(
    {
      err: errorObj,
      context,
      stack: errorObj.stack,
    },
    errorObj.message
  )

  // Handle based on whether UI is rendered
  if (router) {
    // UI is rendered, navigate to error view
    router.setError(errorObj)
  } else {
    // UI is not rendered, exit
    console.error(errorObj.message)
    if (context) {
      console.error(`Context: ${context}`)
    }
    process.exit(exitCode)
  }
}
