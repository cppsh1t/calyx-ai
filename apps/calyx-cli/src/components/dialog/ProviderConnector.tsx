import type { DialogContentProps } from '@/utils/dialog'
import { KeyBindPriorityEnum, useKeyBind } from '@/utils/keybind'
import { TextAttributes } from '@opentui/core'
import { Dynamic } from '@opentui/solid'
import { createSignal, type JSX } from 'solid-js'

type Step = 'select-provider' | 'input-key'

export function ProviderConnector(props: DialogContentProps<string>): JSX.Element {
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [step, setStep] = createSignal<Step>('select-provider')
  const [selectedProvider, setSelectedProvider] = createSignal<string | null>(null)
  const [apiKey, setAPIKey] = createSignal('')

  const providers = ['openai', 'azure', 'custom']

  function handleProviderSelect(providerId: string) {
    setSelectedProvider(providerId)
    setStep('input-key')
  }

  function handleAPIKeySubmit() {
    props.confirm(apiKey())
  }

  function ProviderSelector(): JSX.Element {
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
            Model Providers
          </text>
          <text fg="#888" attributes={TextAttributes.DIM}>
            esc
          </text>
        </box>

        <box flexGrow={1}>
          <select
            options={providers.map((val) => ({
              name: val,
              description: `Connect to ${val} provider`,
              value: val,
            }))}
            height={18}
            selectedIndex={selectedIndex()}
            flexGrow={1}
            itemSpacing={0.5}
            onSelect={(index, option) => {
              if (option) {
                handleProviderSelect(option.value)
              }
            }}
            onChange={(index, option) => {
              setSelectedIndex(index)
            }}
            showDescription={false}
            focused
          />
        </box>
      </box>
    )
  }

  function APIKeyInputWrapper(): JSX.Element {
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
            API key ({selectedProvider()})
          </text>
          <text fg="#888" attributes={TextAttributes.DIM}>
            esc
          </text>
        </box>

        <box flexGrow={1} paddingLeft={3} paddingRight={3}>
          <input value={apiKey()} onInput={setAPIKey} onSubmit={handleAPIKeySubmit} placeholder="Enter your API key" width="100%" focused />
        </box>

        <box paddingLeft={3} marginTop={1} paddingTop={1} paddingBottom={1}>
          <text fg="#888">enter to submit</text>
        </box>
      </box>
    )
  }

  return <Dynamic component={step() === 'select-provider' ? ProviderSelector : APIKeyInputWrapper} />
}

export default ProviderConnector
