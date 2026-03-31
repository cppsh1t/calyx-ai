/**
 * Logging module — structured logging utilities and log cleanup.
 *
 * Core-safe: no `solid-js`, no UI coupling.
 */

export { cleanupOldLogs } from '@/logging/log-cleanup.ts'
export { Logger } from '@/logging/logger.ts'
export type { LogEntry, LogLevel, LoggerOptions } from '@/logging/logger.ts'
