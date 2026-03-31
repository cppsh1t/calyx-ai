/**
 * Core-safe structured logger.
 *
 * Features:
 * - Log levels: DEBUG, INFO, WARN, ERROR
 * - File logging with daily rotation and size-based rotation (10 MB)
 * - Console output with optional ANSI colours
 * - In-memory log history (plain data, no reactive coupling)
 * - Automatic log cleanup on construction
 *
 * No `solid-js`, no UI components, no Bun-only APIs.
 */

import { cleanupOldLogs } from '@/logging/log-cleanup.ts'
import { appendFile, copyFile, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

// ---------------------------------------------------------------------------
// ANSI colour helpers
// ---------------------------------------------------------------------------

const COLORS = {
  DEBUG: '\x1b[90m', // Gray
  INFO: '\x1b[36m', // Cyan
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  RESET: '\x1b[0m',
} as const

const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = keyof typeof LEVELS

export interface LogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  timestamp: string
  message: string
}

export interface LoggerOptions {
  /** Directory where log files are stored. Defaults to `<cwd>/.calyx-logs`. */
  logDir?: string
  /** Maximum number of entries kept in in-memory history. Default `50`. */
  maxHistory?: number
  /** Maximum log file size in bytes before rotation. Default `10_485_760` (10 MB). */
  maxLogSize?: number
  /** Whether to enable ANSI colour output. Defaults to auto-detect. */
  useColors?: boolean | null
  /** Whether to include DEBUG entries in history. Default `false`. */
  verboseHistory?: boolean
  /** Run log cleanup on construction. Default `true`. */
  autoCleanup?: boolean
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MAX_LOG_SIZE = 10 * 1024 * 1024 // 10 MB
const DEFAULT_MAX_HISTORY = 50

function detectColorSupport(): boolean {
  // Respect NO_COLOR convention (https://no-color.org/)
  if (process.env['NO_COLOR'] !== undefined) return false
  // In non-TTY contexts (CI, pipes) avoid colours by default
  if (!process.stdout.isTTY) return false
  return true
}

function defaultLogDir(): string {
  // If a data dir is available from config, nest logs under it.
  // Otherwise fall back to `<cwd>/.calyx-logs`.
  try {
    return join(process.cwd(), '.calyx-logs')
  } catch {
    return '.calyx-logs'
  }
}

// ---------------------------------------------------------------------------
// Logger class
// ---------------------------------------------------------------------------

export class Logger {
  private readonly _logDir: string
  private readonly _maxHistory: number
  private readonly _maxLogSize: number
  private readonly _useColors: boolean
  private readonly _verboseHistory: boolean
  private _logFile: string
  private _history: LogEntry[] = []

  constructor(opts: LoggerOptions = {}) {
    this._logDir = opts.logDir ?? defaultLogDir()
    this._maxHistory = opts.maxHistory ?? DEFAULT_MAX_HISTORY
    this._maxLogSize = opts.maxLogSize ?? DEFAULT_MAX_LOG_SIZE
    this._useColors = opts.useColors ?? detectColorSupport()
    this._verboseHistory = opts.verboseHistory ?? false

    const today = new Date().toISOString().slice(0, 10)
    this._logFile = join(this._logDir, `calyx-${today}.log`)

    if (opts.autoCleanup !== false) {
      cleanupOldLogs(this._logDir).catch(() => {
        // Silently ignore — never disrupt startup
      })
    }
  }

  // -- Private helpers -----------------------------------------------------

  /**
   * Format an object for logging (handles `Error` objects specially).
   */
  private formatObject(obj: Record<string, unknown>): string {
    const lines: string[] = []
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'err' && value instanceof Error) {
        lines.push(`  Error: ${value.message}`)
        if (value.stack) {
          lines.push(
            value.stack
              .split('\n')
              .map((l) => '    ' + l)
              .join('\n')
          )
        }
      } else if (key === 'context') {
        lines.push(`  Context: ${String(value)}`)
      } else {
        lines.push(`  ${key}: ${String(value)}`)
      }
    }
    return lines.join('\n')
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19)
  }

  private formatConsole(level: LogLevel, message: string): string {
    const timestamp = this.getTimestamp()
    const levelStr = level.padEnd(5)
    const color = COLORS[level]
    const reset = this._useColors ? COLORS.RESET : ''
    const colorStart = this._useColors ? color : ''

    return `${colorStart}[${levelStr}] [${timestamp}] ${message}${reset}`
  }

  private formatFile(level: LogLevel, message: string): string {
    const timestamp = this.getTimestamp()
    const levelStr = level.padEnd(5)
    return `[${levelStr}] [${timestamp}] ${message}`
  }

  /**
   * Rotate the log file when the date changes or it exceeds the size limit.
   */
  private async checkRotation(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10)
    const currentFileName = `calyx-${today}.log`
    const currentPath = join(this._logDir, currentFileName)

    if (currentFileName !== this._logFile.split(/[\\/]/).pop()) {
      this._logFile = currentPath
      return
    }

    try {
      const stats = await stat(this._logFile)
      if (stats.size > this._maxLogSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const rotatedPath = join(this._logDir, `calyx-${today}-${timestamp}.log`)
        await copyFile(this._logFile, rotatedPath)
        this._logFile = currentPath
      }
    } catch {
      // File doesn't exist yet — will be created on first write
    }
  }

  private async ensureLogDir(): Promise<void> {
    try {
      await mkdir(this._logDir, { recursive: true })
    } catch {
      // Silently fail
    }
  }

  private async writeToFile(message: string): Promise<void> {
    try {
      await this.checkRotation()
      await this.ensureLogDir()
      await appendFile(this._logFile, message + '\n', 'utf-8')
    } catch {
      // Silently fail if file writing fails
    }
  }

  private addToHistory(level: LogEntry['level'], message: string): void {
    const entry: LogEntry = {
      level,
      timestamp: this.getTimestamp(),
      message,
    }
    this._history.unshift(entry)
    if (this._history.length > this._maxHistory) {
      this._history = this._history.slice(0, this._maxHistory)
    }
  }

  // -- Public API ----------------------------------------------------------

  /**
   * Core logging method. Consumers should prefer the typed helpers
   * (`debug`, `info`, `warn`, `error`).
   */
  async log(level: LogLevel, message: string, obj?: Record<string, unknown>): Promise<void> {
    // History capture: INFO/WARN always; DEBUG only in verbose mode; ERROR never (bubbles to console.error)
    if (level === 'INFO' || level === 'WARN' || (this._verboseHistory && level === 'DEBUG')) {
      this.addToHistory(level, message)
    }

    const consoleMessage = this.formatConsole(level, message)
    if (level === 'WARN' || level === 'ERROR') {
      console.error(consoleMessage)
    } else {
      console.log(consoleMessage)
    }

    const fileMessage = this.formatFile(level, message)
    if (obj) {
      const objStr = this.formatObject(obj)
      await this.writeToFile(`${fileMessage}\n${objStr}`)
    } else {
      await this.writeToFile(fileMessage)
    }
  }

  /** Log a debug message. */
  async debug(message: string, obj?: Record<string, unknown>): Promise<void> {
    await this.log('DEBUG', message, obj)
  }

  /** Log an info message. */
  async info(message: string, obj?: Record<string, unknown>): Promise<void> {
    await this.log('INFO', message, obj)
  }

  /** Log a warning message. */
  async warn(message: string, obj?: Record<string, unknown>): Promise<void> {
    await this.log('WARN', message, obj)
  }

  /**
   * Log an error message.
   *
   * Supports two signatures:
   * - `error(message)` — simple string
   * - `error({ err, context }, message?)` — structured object + optional message
   */
  async error(objOrMessage: Record<string, unknown> | string, message?: string): Promise<void> {
    if (typeof objOrMessage === 'string') {
      await this.log('ERROR', objOrMessage)
    } else {
      await this.log('ERROR', message ?? 'Error occurred', objOrMessage)
    }
  }

  // -- History (plain data, no reactivity) ---------------------------------

  /**
   * Return a **snapshot** of the in-memory log history (most recent first).
   *
   * Returns a new array on each call — callers can freely mutate without
   * affecting the logger's internal state.
   */
  getHistory(): LogEntry[] {
    return [...this._history]
  }

  /**
   * Clear all in-memory log history.
   */
  clearHistory(): void {
    this._history = []
  }
}
