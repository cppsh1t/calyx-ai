import envPaths from 'env-paths'
import { join } from 'node:path'
import pino from 'pino'
import { cleanupOldLogs } from './log-cleanup.ts'

const paths = envPaths('calyx-cli', { suffix: '' })
const logDir = join(paths.config, 'logs')

// Check if running in compiled mode (Bun compile doesn't support pino.transport)
const isCompiled = process.execPath !== process.argv[0]

// Only use file transport in development mode
// Compiled executables use stdout/stderr only
const transport = isCompiled
  ? undefined
  : pino.transport({
      target: 'pino-roll',
      options: {
        file: join(logDir, 'calyx.log'),
        frequency: 'daily',
        dateFormat: 'yyyy-MM-dd',
        mkdir: true,
        size: '10m',
      },
    })

export const logger = pino(
  {
    level: 'info',
  },
  transport
)

export default logger

// Clean up old log files on logger initialization (only in dev mode)
if (!isCompiled) {
  cleanupOldLogs(logDir).catch((err) => {
    // Silently ignore cleanup errors to not disrupt application startup
    logger.warn({ err }, 'Failed to clean up old log files')
  })
}
