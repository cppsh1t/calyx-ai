#!/usr/bin/env bun
import { Command, InvalidArgumentError } from "commander";
import type {
  GlobalOptions,
  CLIConfig,
  ChatOptions,
  AskOptions,
} from "./types/cli.ts";

const program = new Command();

// Configure program
program
  .name("calyx")
  .description("AI-driven command-line interaction tool")
  .version("1.0.0");

// Global options
program
  .option("-m, --model <name>", "Model alias", "auto")
  .option("-a, --agent <name>", "Default agent", "prometheus")
  .option("--temperature <number>", "Creativity (0.0-2.0)", "0.7")
  .option("-d, --debug", "Debug mode", false)
  .option("-v, --verbose", "Verbose output", false)
  .option("-c, --config <path>", "Config file path");

// Validation functions
function parseTemperature(value: string): number {
  const temp = parseFloat(value);
  if (isNaN(temp) || temp < 0.0 || temp > 2.0) {
    throw new InvalidArgumentError("Temperature must be between 0.0 and 2.0");
  }
  return temp;
}

function validateModel(model: string): void {
  const validModels = ["auto", "pro", "flash"];
  if (!validModels.includes(model)) {
    throw new InvalidArgumentError(
      `Model must be one of: ${validModels.join(", ")}`,
    );
  }
}

function validateAgent(agent: string): void {
  const validAgents = ["prometheus", "sisyphus", "oracle"];
  if (!validAgents.includes(agent)) {
    throw new InvalidArgumentError(
      `Agent must be one of: ${validAgents.join(", ")}`,
    );
  }
}

// chat command
program
  .command("chat [prompt]")
  .description("Start interactive chat or send single prompt")
  .option("-s, --session <id>", "Resume session")
  .option("--new-session", "Force new session")
  .option("-i, --prompt-interactive", "Continue after prompt")
  .action(async (prompt, options) => {
    const globalOpts = program.opts<GlobalOptions>();

    // Validate
    validateModel(globalOpts.model);
    validateAgent(globalOpts.agent);

    const config: CLIConfig = {
      ...globalOpts,
      temperature: parseTemperature(globalOpts.temperature.toString()),
      command: "chat",
      prompt,
      chatOptions: options as ChatOptions,
    };

    // Launch TUI with config
    const { renderTUI } = await import("./tui.tsx");
    renderTUI(config);
  });

// ask command
program
  .command("ask <prompt>")
  .description("Single question, non-interactive")
  .option("-F, --file <path>", "Read prompt from file")
  .option("-C, --context <paths...>", "Add context")
  .action(async (prompt, options) => {
    const globalOpts = program.opts<GlobalOptions>();

    // Validate
    validateModel(globalOpts.model);
    validateAgent(globalOpts.agent);

    const config: CLIConfig = {
      ...globalOpts,
      temperature: parseTemperature(globalOpts.temperature.toString()),
      command: "ask",
      prompt,
      askOptions: options as AskOptions,
    };

    // Launch TUI with config
    const { renderTUI } = await import("./tui.tsx");
    renderTUI(config);
  });

// Parse and handle errors
try {
  program.parse();
} catch (error) {
  console.error("Error:", error);
  // Still launch TUI with error state (per user requirement)
  process.exit(1);
}

export { program };
