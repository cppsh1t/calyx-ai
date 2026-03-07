import { readdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Remove log files older than 30 days from the specified directory.
 *
 * This function:
 * - Only processes .log files (not directories or other file types)
 * - Deletes files based on mtime (modification time)
 * - Does NOT delete today's logs (logs from within last 30 days)
 * - Does NOT recursively delete subdirectories
 * - Silently ignores all errors (permission issues, missing directory, etc.)
 *
 * @param logDir - Absolute path to the log directory
 * @returns Promise that resolves when cleanup is complete
 */
export async function cleanupOldLogs(logDir: string): Promise<void> {
  try {
    const files = await readdir(logDir)
    const now = Date.now()

    for (const file of files) {
      // Skip non-log files
      if (!file.endsWith('.log')) continue

      const filePath = join(logDir, file)
      const stats = await stat(filePath)

      // Only delete if file is older than 30 days
      if (now - stats.mtime.getTime() > THIRTY_DAYS_MS) {
        await unlink(filePath)
      }
    }
  } catch {
    // Silently ignore cleanup errors
  }
}
