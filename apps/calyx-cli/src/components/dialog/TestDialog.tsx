import type { DialogContentProps } from '@/utils/dialog.tsx'
import { TextAttributes } from '@opentui/core'
import type { JSX } from 'solid-js'
import { createSignal } from 'solid-js'

export function TestDialog(props: DialogContentProps<string>): JSX.Element {
  const [value, setValue] = createSignal('')

  return (
    <box flexDirection="column" width={50} backgroundColor="#1a1a1a" padding={1}>
      <box marginBottom={1}>
        <text fg="#fff" attributes={TextAttributes.BOLD}>
          Test Dialog
        </text>
      </box>

      <box marginBottom={1}>
        <text fg="#888">Enter some text:</text>
      </box>

      <box marginBottom={1}>
        <input value={value()} onInput={setValue} placeholder="Type something..." width={40} focused />
      </box>

      <box marginBottom={1}>
        <text fg="#333">────────────────────────────────────────────────</text>
      </box>

      <box flexDirection="row" justifyContent="flex-end" gap={2}>
        <box border paddingLeft={2} paddingRight={2} onMouseDown={() => props.confirm(value())}>
          <text fg="green" attributes={TextAttributes.BOLD}>
            [Confirm]
          </text>
        </box>
        <box border paddingLeft={2} paddingRight={2} onMouseDown={() => props.cancel()}>
          <text fg="red">[Cancel]</text>
        </box>
      </box>
    </box>
  )
}

export default TestDialog
