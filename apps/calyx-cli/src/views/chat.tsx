import { createSignal } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { useRouter } from "@/views/router.tsx";
import type { JSX } from "solid-js";

/**
 * ChatView component for AI chat interface.
 *
 * Features:
 * - Single input field for typing messages
 * - Auto-focused input on mount
 * - Escape key navigation back to welcome view
 * - Skeleton for future chat functionality
 *
 * TODO: Add chat logic here
 * - Message history display
 * - API integration for AI responses
 * - Message submission handling (Enter key)
 * - User/assistant message differentiation
 * - Scrollable message list
 * - etc.
 */
export function ChatView(): JSX.Element {
  // Input value signal for reactive state
  const [message, setMessage] = createSignal("");

  // Router navigation
  const { navigate } = useRouter();

  // Handle Escape key to navigate back to welcome view
  useKeyboard((key) => {
    if (key.name === "escape") {
      navigate("welcome");
    }
  });

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      justifyContent="center"
      alignItems="center"
    >
      {/* Chat view title */}
      <text>
        <strong>Chat View</strong>
      </text>

      {/* Instructions */}
      <text marginTop={1} fg="#888">
        Press Escape to return to welcome
      </text>

      {/* TODO: Add chat logic here
          - Message history display (scrollable list)
          - API integration for AI responses
          - Message submission handling (Enter key)
          - User/assistant message styling
          - Loading states
          - Error handling
          - etc.
      */}

      {/* Input field for typing messages */}
      <input
        value={message()}
        onInput={setMessage}
        placeholder="Type your message..."
        focused
        width={50}
        marginTop={2}
      />
    </box>
  );
}

export default ChatView;
