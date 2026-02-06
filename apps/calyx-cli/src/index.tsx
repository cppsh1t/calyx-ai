#!/usr/bin/env bun
import { program, getParsedConfig } from "@/utils/cli.ts";
import { renderTUI } from "@/views/tui.tsx";
import { DEFAULT_GLOBAL_OPTIONS, type CLIConfig } from "@/types/cli.ts";

try {
  await program.parseAsync(process.argv);
  const config = getParsedConfig();

  if (config) {
    renderTUI(config);
  } else {
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
