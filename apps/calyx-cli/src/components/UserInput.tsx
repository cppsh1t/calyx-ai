import logger from '@/utils/logger'
import type { InputRenderable, SubmitEvent } from '@opentui/core'
import type { InputProps } from '@opentui/solid'
import { createMemo, createSignal, onMount, type JSX, type Ref } from 'solid-js'

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
    return history.length > 0 ? history[0] : null
  })

  const logColor = createMemo(() => {
    const log = lastLog()
    if (!log) return '#888'
    return log.level === 'WARN' ? '#f59e0b' : '#22d3ee' // WARN: yellow, INFO: cyan
  })

  return (
    <box flexDirection="column">

      {/* Main content area */}
      <box backgroundColor="#1a1a1a" minHeight={5} border={['left']} marginBottom={1} borderStyle={'heavy'} borderColor="#3b82f6" flexGrow={1} paddingTop={1} paddingBottom={1} paddingLeft={2} paddingRight={2} flexDirection="column">
        <input onMouseDown={setInputFocus} ref={inputRef} focused placeholder="Maybe you can ask something..." value={inputValue()} onInput={(e) => setInputValue(e)} marginBottom={1} onSubmit={handleSubmit} />
        <text><span style={{fg: '#3b82f6'}}>Flow(test)</span><span>  {props.running ? 'Running...' : ''}</span></text>
      </box>

      {/* Footer */}
      <box gap={2} flexDirection="row-reverse">
        <text flexShrink={0}>
          <span style={{ fg: 'white' }}>ctrl+p</span>
          <span style={{ fg: '#888' }}> commands</span>
        </text>
        <text flexShrink={0}>
          <span style={{ fg: 'white' }}>tab</span>
          <span style={{ fg: '#888' }}> flows</span>
        </text>
        <text flexGrow={1} flexWrap='no-wrap' truncate wrapMode='none'>
          {lastLog() && (
            <span style={{ fg: logColor() }}>
              [{lastLog()?.level}] {lastLog()?.message}
            </span>
          )}
        </text>
      </box>
    </box>
  )
}

export default UserInput
