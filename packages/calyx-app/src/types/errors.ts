/**
 * Core error handling types — UI-agnostic contracts.
 *
 * All types are designed for library consumers who need structured error
 * information without coupling to any specific UI framework or router.
 */

/**
 * Well-known error codes used across the calyx-app library.
 *
 * Consumers can switch on these codes to decide how to surface errors
 * (e.g. show a toast, navigate to error page, retry, exit, etc.).
 */
export enum CalyxErrorCode {
  /** Unknown / unclassified error. */
  UNKNOWN = 'UNKNOWN',
  /** A network request failed. */
  NETWORK = 'NETWORK',
  /** Required configuration is missing or invalid. */
  CONFIG = 'CONFIG',
  /** Authentication / API key issue. */
  AUTH = 'AUTH',
  /** Filesystem operation failed (ENOENT, EACCES, etc.). */
  FILESYSTEM = 'FILESYSTEM',
  /** Provider registry or model list failure. */
  PROVIDER = 'PROVIDER',
  /** CLI argument parsing error. */
  CLI_PARSE = 'CLI_PARSE',
  /** A validation constraint was violated. */
  VALIDATION = 'VALIDATION',
}

/**
 * Structured error result produced by the error handler.
 *
 * Consumers receive this instead of having the handler call `process.exit`
 * or navigate to a UI view — the decision of what to do is left to the caller.
 */
export interface HandledError {
  /** Normalized Error object (always an Error, never unknown). */
  error: Error
  /** Machine-readable error code for programmatic handling. */
  code: CalyxErrorCode
  /** Optional context label set by the caller (e.g. "init-project"). */
  context?: string
  /** Whether the original input was already an Error instance. */
  wasError: boolean
}

/**
 * Options for the unified error handler.
 *
 * Unlike the CLI version, this does NOT accept a router reference.
 * Instead, the handler logs the error and returns a structured result
 * that the consumer can act on.
 */
export interface HandleErrorOptions {
  /** Machine-readable error code. Defaults to {@link CalyxErrorCode.UNKNOWN}. */
  code?: CalyxErrorCode
  /** Human-readable context label for log output. */
  context?: string
}

/**
 * Minimal logger interface required by the error handler.
 *
 * This is a subset of the {@link Logger} class from the logging module,
 * allowing consumers to inject any compatible logger.
 */
export interface ErrorHandlerLogger {
  error(objOrMessage: Record<string, unknown> | string, message?: string): void | Promise<void>
}
