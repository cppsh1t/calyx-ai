import logger from '@/utils/logger'
import { createMemo, createSignal, For } from 'solid-js'

export function LogRecord() {
  const loggerMessages = createMemo(() => {
    return logger.history().map((item) => `[${item.level}] ${item.message}`)
  })

  return (
    <box width={60} height={24} backgroundColor="#1a1a1a"  flexDirection="column" padding={1}>
      <scrollbox width="100%" flexGrow={1}  flexDirection='column' gap={1} >
        <For each={loggerMessages()}>
          {(message) => (
            <box width="100%" padding={1}>
              <text fg='#fff' width="100%" truncate wrapMode="none">
                {message}
              </text>
            </box>
          )}
        </For>
      </scrollbox>
    </box>
  )
}

export default LogRecord
