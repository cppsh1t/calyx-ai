#!/usr/bin/env bun
import { parseCli } from "@/utils/cli.ts";
import { initUserConfig } from "@/utils/config.ts";
import { Router } from "@/views/router.tsx";
import { render } from "@opentui/solid";
import { handleError } from "@/utils/error-handler.ts";

try {
  await initUserConfig();
  const result = await parseCli(process.argv);

  // Check if running in a TTY environment
  // OpenTUI requires a terminal to function properly
  if (!process.stdout.isTTY) {
    console.error("Error: Calyx CLI requires a TTY environment to run.");
    console.error("Please run in a proper terminal (not CI/non-interactive).");
    process.exit(1);
  }

  // Only render TUI if no subcommand was executed (e.g., init, help, etc.)
  if (result.shouldRenderTUI && result.parsedConfig) {
    // Render Router directly (ErrorBoundary not supported in OpenTUI)
    // Error handling is managed by the Router's error view
    // OpenTUI handles cleanup via exitOnCtrlC option
    await render(() => <Router config={result.parsedConfig!} />, {
      exitOnCtrlC: true,
    });
  }
} catch (error) {
  // Catch async errors that happen before render
  await handleError(error, { context: "initialization" });
}
