import { execa } from 'execa'
import logger from './logger'
import zod from 'zod'

export const runCommandToolParamZod = zod.object({
  command: zod.string().describe("要让bash执行的命令")
})

export async function runCommand(command: string): Promise<string> {
  const bashPath = '/mnt/d/env/Git/bin/bash.exe'

  try {
    logger.info(`Executing command: ${command}`)
    logger.debug(`Using shell: ${bashPath}`)

    const result = await execa(bashPath, ['-c', command], {
      windowsHide: true,
      cwd: process.cwd(),
      env: process.env,
    })

    const output = result.stdout || ''
    logger.info(`shell result: ${output}`)

    return output
  } catch (error) {

    if (error && typeof error === 'object' && 'stdout' in error) {
      const execaError = error as { stdout?: string; stderr?: string; message: string }
      const errorOutput = execaError.stdout || execaError.stderr || execaError.message
      logger.error(`shell error: ${errorOutput}`)
      return errorOutput
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`shell error: ${errorMessage}`)
    return errorMessage
  }
}
