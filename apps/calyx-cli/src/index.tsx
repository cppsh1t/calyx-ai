#!/usr/bin/env bun
import { parseCli } from "@/utils/cli.ts";
import { initUserConfig } from "@/utils/config.ts";
import { Router } from "@/views/router.tsx";
import { render } from "@opentui/solid";
import { ErrorBoundary } from "solid-js";

try {
  await initUserConfig();
  const result = await parseCli(process.argv);

  // Only render TUI if no subcommand was executed (e.g., init, help, etc.)
  if (result.shouldRenderTUI && result.parsedConfig) {
    // Render Router with ErrorBoundary for global error handling
    // OpenTUI handles cleanup via exitOnCtrlC option
    await render(
      () => (
        <ErrorBoundary
          fallback={(err: Error, reset: () => void) => {
            // Create simple error display
            return (
              <box padding={2}>
                <text fg="red">Fatal Error: {err.message}</text>
                <text>Press Ctrl+C to exit</text>
              </box>
            );
          }}
        >
          <Router config={result.parsedConfig!} />
        </ErrorBoundary>
      ),
      { exitOnCtrlC: true },
    );
  }
} catch (error) {
  // Catch async errors that happen before render
  console.error("Initialization error:", error);
  process.exit(1);
}
