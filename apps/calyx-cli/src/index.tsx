#!/usr/bin/env bun
import { program, getParsedConfig } from "@/utils/cli.ts";
import { renderTUI } from "@/views/tui.tsx";
import { DEFAULT_GLOBAL_OPTIONS, type CLIConfig } from "@/types/cli.ts";
import type { CliRenderer } from "@opentui/core";

let renderer: CliRenderer | null = null;

try {
  await program.parseAsync(process.argv);
  const config = getParsedConfig();

  if (config) {
    renderer = await renderTUI(config);
  } else {
    const defaultConfig: CLIConfig = {
      ...DEFAULT_GLOBAL_OPTIONS,
      command: "chat",
    };
    renderer = await renderTUI(defaultConfig);
  }
} catch (error) {
  // Use stderr for error messages
  console.error("Fatal error:", error);

  // Clean up terminal if renderer was created
  // This prevents leaving terminal in broken state (alternate screen, raw mode, etc.)
  if (renderer) {
    renderer.destroy();
  }

  // Exit with error code (only after cleanup)
  process.exit(1);
}
