import { Show } from "solid-js";
import type { JSX } from "solid-js";

/**
 * ErrorView component for displaying error messages in the TUI.
 *
 * Features:
 * - Centralized error display with red/bold styling
 * - Optional scrollable stack trace
 * - Bottom hint for Ctrl+C exit (no navigation)
 * - Terminal view (user cannot navigate away)
 *
 * @param props.error - The error object (may be null)
 * @param props.message - Human-readable error message
 */
export function ErrorView(props: {
  error: Error | null;
  message: string;
}): JSX.Element {
  return (
    <box flexDirection="column" flexGrow={1} padding={2}>
      {/* Central error display */}
      <box
        flexDirection="column"
        flexGrow={1}
        justifyContent="center"
        alignItems="center"
      >
        {/* Error icon and title */}
        <text fg="red">
          <strong>⚠ Error</strong>
        </text>

        {/* Error message */}
        <text marginTop={1} fg="red">
          {props.message}
        </text>

        {/* Optional: Scrollable stack trace */}
        <Show when={props.error?.stack}>
          <scrollbox height={10} marginTop={2} width="100%">
            <text fg="#888">{props.error?.stack}</text>
          </scrollbox>
        </Show>
      </box>

      {/* Bottom exit hint */}
      <box marginTop="auto" justifyContent="center">
        <text fg="#666">Press Ctrl+C to exit</text>
      </box>
    </box>
  );
}

export default ErrorView;
