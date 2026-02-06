#!/usr/bin/env bun
import { Command, InvalidArgumentError } from "commander";
import {
  convertCliConfig,
  type CliConfigParsed,
  type CliConfigRaw,
} from "@/types/cli.ts";
import {
  initProjectConfig,
  copyUserToProjectConfig,
  configExists,
  getProjectConfigPath,
  ConfigError,
  ConfigErrorType,
} from "@/utils/config.ts";
import packageJson from "../../package.json" with { type: "json" };

let parsedConfig: CliConfigParsed | null = null;

export function getParsedConfig(): CliConfigParsed | null {
  return parsedConfig;
}

export function resetConfigForTesting(): void {
  parsedConfig = null;
}

const program = new Command();

program
  .name("calyx")
  .description("AI-driven command-line interaction tool")
  .version(packageJson.version);

program
  .option("-c, --continue", "Continue previous session", false)
  .option("-s, --session <id>", "Session ID to continue")
  .option("-f, --flow <name>", "Flow to use");

// Init subcommand
program
  .command("init")
  .description("Initialize Calyx configuration in current project")
  .option("-c, --copy", "Copy user configuration to project")
  .action(async (options: { copy?: boolean }) => {
    try {
      const projectConfigPath = getProjectConfigPath();

      // Check if configuration already exists
      if (await configExists(projectConfigPath)) {
        console.error(`Configuration already exists: ${projectConfigPath}`);
        console.error(
          "Use 'calyx config' commands to manage existing configuration.",
        );
        process.exit(1);
      }

      // Initialize configuration
      if (options.copy) {
        await copyUserToProjectConfig();
      } else {
        await initProjectConfig();
      }

      console.log("✓ Configuration initialized successfully");
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error(`Configuration error: ${error.message}`);
        if (error.path) {
          console.error(`Path: ${error.path}`);
        }
        process.exit(1);
      }
      console.error(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

program.action(async () => {
  const opts = program.opts<CliConfigRaw>();
  const config = convertCliConfig(opts);
  parsedConfig = config;
});

export { program };
