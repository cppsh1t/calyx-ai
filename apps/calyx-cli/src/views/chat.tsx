import BotMessage from '@/components/BotMessage'
import LoadingIndicator from '@/components/LoadingIndicator'
import UserInput from '@/components/UserInput'
import UserMessage from '@/components/UserMessage'
import { streamChat } from '@/services/llm.ts'
import logger from '@/utils/logger'
import { addAssistantMessage, addMessage, messageHistory, updateLastMessage } from '@/utils/message'
import type { JSX } from 'solid-js'
import { For, createSignal } from 'solid-js'

export function ChatView(): JSX.Element {
  const [isLoading, setIsLoading] = createSignal(false)

  async function handleUserInputSubmit(value: string) {
    if (!value.trim()) return

    await logger.debug('handleUserInputSubmit started', { inputLength: value.length })

    // 1. Add user message
    addMessage({ role: 'user', content: value })

    // 2. Set loading state
    setIsLoading(true)

    try {
      await logger.debug('Calling streamChat')
      // 3. Get stream
      const result = await streamChat(value)

      // 4. Create empty assistant message
      addAssistantMessage()

      // 5. Iterate stream and update progressively
      let accumulatedContent = ''
      for await (const chunk of result.textStream) {
        accumulatedContent += chunk
        updateLastMessage(accumulatedContent)
      }

      await logger.debug('Stream completed', { responseLength: accumulatedContent.length })
    } catch (error) {
      await logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Chat error')
      // 6. Handle error - add error message to history
      addMessage({
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    } finally {
      setIsLoading(false)
    }
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

      <scrollbox width="100%" flexGrow={1} paddingTop={1}>
        <For each={messageHistory()}>
          {(message) => (
            <box flexDirection="column" width="100%">
              {message.role === 'user' ? <UserMessage content={message.content} /> : <BotMessage content={message.content} />}
            </box>
          )}
        </For>
      </scrollbox>

      {isLoading() && <LoadingIndicator />}

      <box width="100%" flexShrink={0} paddingLeft={2} paddingRight={2} marginTop={2}>
        <UserInput onSubmit={handleUserInputSubmit} />
      </box>
    </box>
  )
}

export default ChatView
