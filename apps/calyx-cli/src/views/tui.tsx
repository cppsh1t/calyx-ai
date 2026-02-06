import { TextAttributes, createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";
import type { CliConfigRaw, CliConfigParsed } from "@/types/cli.ts";
import type { CliRenderer } from "@opentui/core";

export async function renderTUI(
  config: CliConfigParsed,
): Promise<CliRenderer> {

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
          <text>continue: {String(config.continue)}</text>
          <text>sessionId: {config.sessionId}</text>
          <text>flow: {config.flowName}</text>
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
