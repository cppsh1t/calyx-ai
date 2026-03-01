import envPaths from 'env-paths'
import { appendFile, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { createSignal } from 'solid-js'
import { cleanupOldLogs } from './log-cleanup.ts'

// ANSI color codes
const COLORS = {
  DEBUG: '\x1b[90m', // Gray
  INFO: '\x1b[36m', // Cyan
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  RESET: '\x1b[0m',
} as const

// Log levels with priority
const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const

const MAX_LOG_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_LOG_HISTORY = 50

// Determine if running in development mode
const isDev = process.env.NODE_ENV !== 'production'

// Determine if console supports colors
const useColors = process.stdout.hasColors?.() ?? false

// Get log directory with fallback
let logDir: string
try {
  // envPaths returns config path with extra 'Config' subdirectory on Windows
  // We want logs in ~/.calyx-cli/logs directly, not ~/.calyx-cli/Config/logs
  const basePath = envPaths('calyx-cli', { suffix: '' }).config
  // Remove trailing 'Config' if it exists (Windows-specific issue)
  logDir = join(basePath.replace(/[/\\]Config$/, ''), 'logs')
} catch {
  logDir = join(process.cwd(), '.calyx-logs')
}

// Current log file name (based on date)
const today = new Date().toISOString().slice(0, 10)
const logFileName = `calyx-${today}.log`
const logPath = join(logDir, logFileName)

export interface LogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN'
  timestamp: string
  message: string
}

class Logger {
  private logFile: string = logPath
  private _history = createSignal<LogEntry[]>([])

  constructor() {
    // Clean up old log files on logger initialization (only in dev mode)
    // Clean up old log files on logger initialization (only in dev mode)
    if (isDev) {
      cleanupOldLogs(logDir).catch(() => {
        // Silently ignore cleanup errors to not disrupt application startup
      })
    }
  }

  /**
   * Format an object for logging (handles Error objects specially)
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

  /**
   * Get current timestamp in format: YYYY-MM-DD HH:MM:SS
   */
  private getTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19)
  }

  /**
   * Format log message for console (with colors if supported)
   */
  private formatConsole(level: keyof typeof LEVELS, message: string): string {
    const timestamp = this.getTimestamp()
    const levelStr = level.padEnd(5)
    const color = COLORS[level]
    const reset = useColors ? COLORS.RESET : ''
    const colorStart = useColors ? color : ''

    return `${colorStart}[${levelStr}] [${timestamp}] ${message}${reset}`
  }

  /**
   * Format log message for file (plain text, no colors)
   */
  private formatFile(level: keyof typeof LEVELS, message: string): string {
    const timestamp = this.getTimestamp()
    const levelStr = level.padEnd(5)
    return `[${levelStr}] [${timestamp}] ${message}`
  }

  /**
   * Check if log file needs rotation (size > 10MB or date changed)
   */
  private async checkRotation(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10)
    const currentFileName = `calyx-${today}.log`
    const currentPath = join(logDir, currentFileName)

    // If date changed, update log file
    if (currentFileName !== this.logFile.split(/[\\/]/).pop()) {
      this.logFile = currentPath
      return
    }

    // Check file size
    try {
      const stats = await stat(this.logFile)
      if (stats.size > MAX_LOG_SIZE) {
        // Rotate by adding timestamp to filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const rotatedPath = join(logDir, `calyx-${today}-${timestamp}.log`)
        await Bun.write(rotatedPath, Bun.file(this.logFile))
        this.logFile = currentPath
      }
    } catch {
      // File doesn't exist yet, will be created on first write
    }
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDir(): Promise<void> {
    try {
      await mkdir(logDir, { recursive: true })
    } catch {
      // Silently fail if directory creation fails
    }
  }

  /**
   * Write log to file (asynchronously, non-blocking)
   */
  private async writeToFile(message: string): Promise<void> {
    try {
      await this.checkRotation()
      await this.ensureLogDir()
      // Use appendFile to append to the log file
      await appendFile(this.logFile, message + '\n', 'utf-8')
    } catch {
      // Silently fail if file writing fails
    }
  }

  /**
   * Add entry to log history (only for INFO and WARN levels)
   */
  private addToHistory(level: 'DEBUG' | 'INFO' | 'WARN', message: string): void {
    const [, setHistory] = this._history
    setHistory(prev => {
      const newEntry: LogEntry = {
        level,
        timestamp: this.getTimestamp(),
        message,
      }
      const newHistory = [newEntry, ...prev]
      // Remove oldest entries if exceeds max capacity
      return newHistory.slice(0, MAX_LOG_HISTORY)
    })
  }

  /**
   * Core logging method
   */
  private async log(level: keyof typeof LEVELS, message: string, obj?: Record<string, unknown>): Promise<void> {
    // Add to history for INFO and WARN (and DEBUG in dev mode)
    if (level === 'INFO' || level === 'WARN' || (isDev && level === 'DEBUG')) {
      this.addToHistory(level, message)
    }

    // Format console output
    const consoleMessage = this.formatConsole(level, message)

    // Use console.log() for DEBUG/INFO, console.error() for WARN/ERROR
    if (level === 'WARN' || level === 'ERROR') {
      console.error(consoleMessage)
    } else {
      console.log(consoleMessage)
    }

    // Format and write to file
    const fileMessage = this.formatFile(level, message)
    if (obj) {
      const objStr = this.formatObject(obj)
      await this.writeToFile(`${fileMessage}\n${objStr}`)
    } else {
      await this.writeToFile(fileMessage)
    }
  }

  /**
   * Log debug message
   */
  async debug(message: string, obj?: Record<string, unknown>): Promise<void> {
    await this.log('DEBUG', message, obj)
  }

  /**
   * Log info message
   */
  async info(message: string, obj?: Record<string, unknown>): Promise<void> {
    await this.log('INFO', message, obj)
  }

  /**
   * Log warning message
   */
  async warn(message: string, obj?: Record<string, unknown>): Promise<void> {
    await this.log('WARN', message, obj)
  }

  /**
   * Log error message
   */
  async error(objOrMessage: Record<string, unknown> | string, message?: string): Promise<void> {
    // Support both patterns:
    // - error({ err, context }, message)
    // - error(message)
    if (typeof objOrMessage === 'string') {
      await this.log('ERROR', objOrMessage)
    } else {
      await this.log('ERROR', message || 'Error occurred', objOrMessage)
    }
  }

  /**
   * Get log history signal (most recent first)
   */
  get history(): () => LogEntry[] {
    const [getHistory] = this._history
    return getHistory
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    const [, setHistory] = this._history
    setHistory([])
  }
}

// Create singleton instance
export const logger = new Logger()
export default logger
