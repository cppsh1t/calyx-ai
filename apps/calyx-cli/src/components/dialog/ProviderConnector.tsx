import type { ProviderConnectionResult, ProvidersResponse } from '@/types/providers'
import { setProviderKey } from '@/utils/auth'
import type { DialogContentProps } from '@/utils/dialog'
import { getProviders } from '@/utils/models-api'
import { TextAttributes } from '@opentui/core'
import { Dynamic } from '@opentui/solid'
import { createSignal, onMount, type JSX } from 'solid-js'

type Step = 'select-provider' | 'input-key'

export function ProviderConnector(props: DialogContentProps<ProviderConnectionResult>): JSX.Element {
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [step, setStep] = createSignal<Step>('select-provider')
  const [selectedProvider, setSelectedProvider] = createSignal<string | null>(null)
  const [apiKey, setAPIKey] = createSignal('')

  // State for providers from API
  const [providers, setProviders] = createSignal<ProvidersResponse>({})
  const [isLoading, setIsLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)

  // Fetch providers on mount
  onMount(async () => {
    try {
      const data = await getProviders()
      setProviders(data)
    } catch {
      setError('Failed to load providers')
    } finally {
      setIsLoading(false)
    }
  })

  // Get provider IDs from fetched data
  const providerList = () => Object.keys(providers())

  function handleProviderSelect(providerId: string) {
    setSelectedProvider(providerId)
    setStep('input-key')
  }

  async function handleAPIKeySubmit() {
    const provider = selectedProvider()
    const key = apiKey()
    if (provider && key) {
      await setProviderKey(provider, key)
      props.confirm({ provider, apiKey: key })
    }
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
          {isLoading() ? (
            <box flexGrow={1} justifyContent="center" alignItems="center">
              <text fg="#888">Loading providers...</text>
            </box>
          ) : error() ? (
            <box flexGrow={1} justifyContent="center" alignItems="center">
              <text fg="#f44">{error()}</text>
            </box>
          ) : providerList().length === 0 ? (
            <box flexGrow={1} justifyContent="center" alignItems="center">
              <text fg="#888">No providers available</text>
            </box>
          ) : (
            <select
              options={providerList().map((val) => ({
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
              onChange={(index, _option) => {
                setSelectedIndex(index)
              }}
              showDescription={false}
              focused
            />
          )}
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
