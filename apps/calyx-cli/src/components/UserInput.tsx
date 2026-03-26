import logger from '@/utils/logger'
import type { InputRenderable, SubmitEvent } from '@opentui/core'
import { createMemo, createSignal, Show, type JSX } from 'solid-js'

type Props = {
  onSubmit?: (value: string) => void
  running?: boolean
}

export function UserInput(props: Props): JSX.Element {
  const [inputValue, setInputValue] = createSignal('')
  let inputRef: InputRenderable | undefined

  function handleSubmit(e: SubmitEvent) {
    if (props.onSubmit) {
      props.onSubmit(inputValue())
    }
    setInputValue('')
  }

  function setInputFocus() {
    if (inputRef) {
      inputRef.focus()
    }
  }

  const lastLog = createMemo(() => {
    const history = logger.history()
    if (history.length === 0) return null
    const entry = history[0]
    if (!entry) return null
    return {
      ...entry,
      message: entry.message.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
    }
  })

  const logColor = createMemo(() => {
    const log = lastLog()
    if (!log) return '#888'
    return log.level === 'WARN' ? '#f59e0b' : '#22d3ee' // WARN: yellow, INFO: cyan
  })

  return (
    <box flexDirection="column">
      {/* Main content area */}
      <box
        backgroundColor="#1a1a1a"
        minHeight={5}
        border={['left']}
        marginBottom={1}
        borderStyle={'heavy'}
        borderColor="#3b82f6"
        flexGrow={1}
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        flexDirection="column"
      >
        <input
          onMouseDown={setInputFocus}
          ref={inputRef}
          focused
          placeholder="Maybe you can ask something..."
          value={inputValue()}
          onInput={(e) => setInputValue(e)}
          marginBottom={1}
          onSubmit={handleSubmit}
        />
        <box flexDirection="row" gap={1}>
          <text fg="#3b82f6">Flow(test)</text>
          <Show when={props.running}>
            <text>Running...</text>
          </Show>
        </box>
      </box>

      {/* Footer */}
      <box gap={2} flexDirection="row-reverse">
        <box flexShrink={0} flexDirection="row">
          <text fg="white">ctrl+p</text>
          <text fg="#888"> commands</text>
        </box>
        <box flexShrink={0} flexDirection="row">
          <text fg="white">tab</text>
          <text fg="#888"> flows</text>
        </box>
        <text flexGrow={1} flexWrap="no-wrap" truncate wrapMode="none" fg={logColor()}>
          {lastLog() ? `[${lastLog()?.level}] ${lastLog()?.message}` : ' '}
        </text>
      </box>
    </box>
  )
}

export default UserInput
