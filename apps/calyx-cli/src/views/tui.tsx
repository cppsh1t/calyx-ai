import { TextAttributes, createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";
import type { CLIConfig } from "@/types/cli.ts";
import type { CliRenderer } from "@opentui/core";

export async function renderTUI(
  initialConfig?: CLIConfig,
): Promise<CliRenderer> {
  const config = initialConfig || {
    command: "chat",
    model: "auto",
    agent: "prometheus",
    temperature: 0.7,
    debug: false,
    verbose: false,
  };

  // Create renderer with proper error handling
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    onDestroy: () => {
      // Cleanup callback when renderer is destroyed
      console.error("\nCalyx CLI shutting down...");
    },
  });

  // Render the TUI component with the created renderer
  render(
    () => (
      <box
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
        flexDirection="column"
      >
        <box justifyContent="center" alignItems="flex-end">
          <ascii_font font="tiny" text="Calyx CLI" />
          <text attributes={TextAttributes.DIM}>
            AI-Powered Command Line Tool
          </text>
        </box>

        <box marginTop={2} flexDirection="column" alignItems="flex-start">
          <text attributes={TextAttributes.BOLD}>Configuration:</text>
          <text>Command: {config.command}</text>
          {config.prompt && <text>Prompt: {config.prompt}</text>}
          <text>Model: {config.model}</text>
          <text>Agent: {config.agent}</text>
          <text>Temperature: {config.temperature}</text>
          <text>Debug: {config.debug.toString()}</text>
          <text>Verbose: {config.verbose.toString()}</text>
        </box>

        <text attributes={TextAttributes.DIM} marginTop={2}>
          Press Ctrl+C to exit
        </text>
      </box>
    ),
    renderer,
  );

  return renderer;
}

export default renderTUI;
