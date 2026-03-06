import logger from "@/utils/logger"
import { $ } from "bun"

export async function runCommand(command: string): Promise<string> {
  try {
    logger.info(`Executing command: ${command}`)
    const result = await $`${command}`
    const output = result.stdout.toString()
    logger.info(`Command completed successfully`)
    return output
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Command execution failed')
    if (error instanceof Error && 'stdout' in error) {
      const execError = error as unknown as { stdout: string; stderr: string }
      return `Error: ${execError.stderr || execError.stdout || error.message}`
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`
  }
}