#!/usr/bin/env bun
import { convertCliConfig, type CliConfigParsed, type CliConfigRaw } from '@/types/cli.ts'
import { ConfigError, configExists, copyUserToProjectConfig, getProjectConfigPath, initProjectConfig } from '@/utils/config.ts'
import { handleError } from '@/utils/error-handler'
import { Command, CommanderError } from 'commander'
import packageJson from '../../package.json' with { type: 'json' }

export interface CliParseResult {
  subcommandExecuted: boolean
  parsedConfig: CliConfigParsed | null
  exitCode: number
  shouldRenderTUI: boolean
}

// Legacy module-level state for backward compatibility with deprecated getters
let legacyParsedConfig: CliConfigParsed | null = null
let legacySubcommandExecuted = false

export async function parseCli(argv: string[] = process.argv): Promise<CliParseResult> {
  const program = new Command()

  program.name('calyx').description('AI-driven command-line interaction tool').version(packageJson.version)

  program
    .option('-c, --continue', 'Continue previous session', false)
    .option('-s, --session <id>', 'Session ID to continue')
    .option('-f, --flow <name>', 'Flow to use')

  let subcommandExecuted = false
  let parsedConfig: CliConfigParsed | null = null
  let exitCode = 0

  program.exitOverride((err: CommanderError) => {
    exitCode = err.exitCode
    throw err
  })

  // Init subcommand
  program
    .command('init')
    .description('Initialize Calyx configuration in current project')
    .option('-c, --copy', 'Copy user configuration to project')
    .action(async (options: { copy?: boolean }) => {
      subcommandExecuted = true
      try {
        const projectConfigPath = getProjectConfigPath()

        // Check if configuration already exists
        if (await configExists(projectConfigPath)) {
          console.error(`Configuration already exists: ${projectConfigPath}`)
          console.error("Use 'calyx config' commands to manage existing configuration.")
          process.exit(1)
        }

        // Initialize configuration
        if (options.copy) {
          await copyUserToProjectConfig()
        } else {
          await initProjectConfig()
        }

        console.log('✓ Configuration initialized successfully')
      } catch (error) {
        if (error instanceof ConfigError) {
          await handleError(error, {
            context: `config-${error.type.toLowerCase()}`,
          })
        } else {
          await handleError(error, { context: 'init-command' })
        }
      }
    })

  program.action(async () => {
    const opts = program.opts<CliConfigRaw>()
    const config = convertCliConfig(opts)
    parsedConfig = config
  })

  try {
    // Don't specify from: "user" - let Commander.js auto-detect
    await program.parseAsync(argv)
  } catch (_err) {
    // exitOverride already captured the exit code
  }

  // Update legacy state for backward compatibility
  legacySubcommandExecuted = subcommandExecuted
  legacyParsedConfig = parsedConfig

  return {
    subcommandExecuted,
    parsedConfig,
    exitCode,
    shouldRenderTUI: !subcommandExecuted && parsedConfig !== null,
  }
}

/**
 * @deprecated Use parseCli() instead. This function exists for backward compatibility.
 */
export function getParsedConfig(): CliConfigParsed | null {
  return legacyParsedConfig
}

/**
 * @deprecated Use parseCli() instead. This function exists for backward compatibility.
 */
export function getSubcommandExecuted(): boolean {
  return legacySubcommandExecuted
}

/**
 * @deprecated Use parseCli() instead. This function exists for backward compatibility.
 */
export function resetConfigForTesting(): void {
  legacyParsedConfig = null
  legacySubcommandExecuted = false
}

/**
 * Test helper function that parses CLI arguments for testing.
 * This is intended for use in test files that need to verify CLI behavior.
 *
 * @param argv - Arguments to parse (defaults to ["bun", "cli"])
 * @returns Promise that resolves when parsing is complete
 *
 * @example
 * ```ts
 * await testParse(["bun", "cli", "--continue"]);
 * const config = getParsedConfig();
 * expect(config?.continue).toBe(true);
 * ```
 */
export async function testParse(argv: string[] = ['bun', 'cli']): Promise<void> {
  await parseCli(argv)
}
