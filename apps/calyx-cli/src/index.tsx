#!/usr/bin/env bun
import { program, getParsedConfig } from "@/utils/cli.ts";
import { renderTUI } from "@/views/tui.tsx";
import { initUserConfig } from "@/utils/config.ts";
import type { CliRenderer } from "@opentui/core";

let renderer: CliRenderer | null = null;

try {
  await initUserConfig();
  await program.parseAsync(process.argv);
  const config = getParsedConfig()!;
  renderer = await renderTUI(config);
} catch (error) {
  console.error("Fatal error:", error);
  if (renderer) {
    renderer.destroy();
  }
  process.exit(1);
}
