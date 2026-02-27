import type { DialogContentProps } from '@/utils/dialog.tsx'
import { TextAttributes } from '@opentui/core'
import type { JSX } from 'solid-js'
import { createSignal } from 'solid-js'


export function TestDialog(props: DialogContentProps<string>): JSX.Element {
  const [value, setValue] = createSignal('')

  return (
    <box flexDirection="column" width={50} backgroundColor="#1a1a1a" padding={1}>
      {/* 标题 */}
      <box marginBottom={1}>
        <text fg="#fff" attributes={TextAttributes.BOLD}>
          Test Dialog
        </text>
      </box>

      {/* 说明 */}
      <box marginBottom={1}>
        <text fg="#888">Enter some text:</text>
      </box>

      {/* 输入框 */}
      <box marginBottom={1}>
        <input value={value()} onInput={setValue} placeholder="Type something..." width={40} focused />
      </box>

      {/* 分隔线 */}
      <box marginBottom={1}>
        <text fg="#333">────────────────────────────────────────────────</text>
      </box>

      {/* 按钮 - 组件自己控制 */}
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
