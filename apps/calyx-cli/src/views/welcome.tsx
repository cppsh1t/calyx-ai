import type { JSX } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/solid";
import { useRouter } from "@/views/router.tsx";

export function WelcomeView(): JSX.Element {
  const { navigate, state } = useRouter();

  // Keyboard shortcut: 'c' to go to chat
  useKeyboard((key) => {
    if (key.name === "c") {
      navigate("chat");
    }
  });

  return (
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
        <text>continue: {String(state.config.continue)}</text>
        <text>sessionId: {state.config.sessionId}</text>
        <text>flow: {state.config.flowName}</text>
      </box>

      {/* Navigation to chat */}
      <box marginTop={2} border onMouseDown={() => navigate("chat")}>
        <text>[C]hat</text>
      </box>

      <text attributes={TextAttributes.DIM} marginTop={2}>
        Press Ctrl+C to exit
      </text>
    </box>
  );
}

export default WelcomeView;
