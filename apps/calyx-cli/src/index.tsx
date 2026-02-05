#!/usr/bin/env bun
import { program } from "./cli.ts";
import { getParsedConfig } from "./cli.ts";
import { renderTUI } from "./tui.tsx";
import { DEFAULT_GLOBAL_OPTIONS } from "./types/cli.ts";
import type { CLIConfig } from "./types/cli.ts";

// Entry point for bundled CLI (production build)
try {
  await program.parseAsync(process.argv);
  const config = getParsedConfig();

  if (config) {
    // Command was provided - render TUI with parsed config
    renderTUI(config);
  } else {
    // No command provided - launch TUI with defaults
    // Add command field to create valid CLIConfig
    const defaultConfig: CLIConfig = {
      ...DEFAULT_GLOBAL_OPTIONS,
      command: "chat",
    };
    renderTUI(defaultConfig);
  }
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
