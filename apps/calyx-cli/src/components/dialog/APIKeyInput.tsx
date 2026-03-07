import type { DialogContentProps } from '@/utils/dialog.tsx'
import { TextAttributes } from '@opentui/core'
import type { JSX } from 'solid-js'
import { createSignal } from 'solid-js'

export function APIKeyInput(props: DialogContentProps<string>): JSX.Element {
  const [apiKey, setAPIKey] = createSignal('')

  function submitAPIKey() {
    props.confirm(apiKey())
  }

  return (
    <box width={60} backgroundColor="#1a1a1a" flexDirection="column">
      <box
        flexDirection="row"
        backgroundColor="#1a1a1a"
        justifyContent="space-between"
        paddingLeft={3}
        paddingRight={3}
        paddingTop={1}
        paddingBottom={1}
        marginBottom={0}
      >
        <text fg="#fff" attributes={TextAttributes.BOLD}>
          API key
        </text>
        <text fg="#888" attributes={TextAttributes.DIM}>
          esc
        </text>
      </box>


      <box flexGrow={1} paddingLeft={3}
        paddingRight={3}>
        <input
          value={apiKey()}
          onInput={(e) => setAPIKey(e)}
          onSubmit={submitAPIKey}
          placeholder="Enter your API key"
          width="100%"
          focused
        />
      </box>

      <box paddingLeft={3} marginTop={1} paddingTop={1} paddingBottom={1}>
        <text fg="#888">enter to submit</text>
      </box>
    </box>
  )
}

export default APIKeyInput
