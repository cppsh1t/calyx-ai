import BotMessage from '@/components/BotMessage'
import UserInput from '@/components/UserInput'
import UserMessage from '@/components/UserMessage'
import { chat, combinedMessages, pendingMessage } from '@/utils/message'
import type { JSX } from 'solid-js'
import { For } from 'solid-js'

export function ChatView(): JSX.Element {
  async function handleUserInputSubmit(value: string) {
    await chat(value)
  }

  return (
    <box flexDirection="column" flexGrow={1} justifyContent="center" width="100%">
      <box
        paddingLeft={2}
        justifyContent="center"
        height={3}
        width="100%"
        border={['left']}
        borderColor="#59db47"
        borderStyle={'heavy'}
        backgroundColor="#1a1a1a"
      >
        <text>这是测试标题</text>
      </box>

      <scrollbox width="100%" flexGrow={1} paddingTop={1} stickyScroll={true} stickyStart="bottom" viewportCulling>
        <For each={combinedMessages()}>
          {(message) => (
            <box width="100%">
              {message.role === 'user' ? (
                <UserMessage content={message.content} />
              ) : (
                <BotMessage content={message.content} usage={message.usage} reason={message.reason} streaming={message.streaming} />
              )}
            </box>
          )}
        </For>
      </scrollbox>

      <box width="100%" flexShrink={0} paddingLeft={2} paddingRight={2} marginTop={2}>
        <UserInput onSubmit={handleUserInputSubmit} running={pendingMessage().running} />
      </box>
    </box>
  )
}

export default ChatView
