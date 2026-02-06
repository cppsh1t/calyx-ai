#!/usr/bin/env bun
import { Command, InvalidArgumentError } from "commander";
import { convertCliConfig, type CliConfigParsed, type CliConfigRaw } from "@/types/cli.ts";
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
  .option("-f, --flow <name>", "Flow to use")


program
  .action(async () => {
    const opts = program.opts<CliConfigRaw>();
    const config = convertCliConfig(opts);
    parsedConfig = config;
  });

export { program };
