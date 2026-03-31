/**
 * Log cleanup — remove log files older than a configurable retention period.
 *
 * Pure Node implementation. No UI / reactive dependencies.
 */

import { readdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'

/** Default retention: 30 days in milliseconds. */
const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Remove log files older than the given retention period from the specified
 * directory.
 *
 * Behaviour:
 * - Only processes `.log` files (not directories or other file types).
 * - Deletes files based on mtime (modification time).
 * - Does NOT delete files within the retention window.
 * - Does NOT recursively delete subdirectories.
 * - Silently ignores all errors (permission issues, missing directory, etc.).
 *
 * @param logDir - Absolute path to the log directory.
 * @param retentionMs - Maximum age in ms before a log file is eligible for
 *                       deletion. Defaults to 30 days.
 */
export async function cleanupOldLogs(logDir: string, retentionMs: number = DEFAULT_RETENTION_MS): Promise<void> {
  try {
    const files = await readdir(logDir)
    const now = Date.now()

    for (const file of files) {
      if (!file.endsWith('.log')) continue

      const filePath = join(logDir, file)
      const stats = await stat(filePath)

      if (now - stats.mtime.getTime() > retentionMs) {
        await unlink(filePath)
      }
    }
  } catch {
    // Silently ignore cleanup errors (missing dir, permission, etc.)
  }
}
