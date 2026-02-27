import { flatCommands } from '@/utils/command'
import { KeyBindPriorityEnum, useKeyBind } from '@/utils/keybind'
import { TextAttributes } from '@opentui/core'
import { createSignal, Show, type JSX } from 'solid-js'

export function CommandPalette(): JSX.Element {
  const [isOpen, setIsOpen] = createSignal(false)
  const [selectedIndex, setSelectedIndex] = createSignal(0)

  // Ctrl+P to open command palette
  useKeyBind(KeyBindPriorityEnum.DIALOG, (event) => {
    if (event.ctrl && event.name === 'p' && !isOpen()) {
      setIsOpen(true)
      return { continue: false }
    }
    return { continue: true }
  })

  // ESC to close
  useKeyBind(KeyBindPriorityEnum.DIALOG, (event) => {
    if (event.name === 'escape' && isOpen()) {
      setIsOpen(false)
      return { continue: false }
    }
    return { continue: true }
  })

  return (
    <Show when={isOpen()}>
      {/* Modal overlay - full screen with centered content */}
      <box
        position="absolute"
        left={0}
        top={0}
        width="100%"
        height="100%"
        justifyContent="center"
        alignItems="center"
        backgroundColor="#1a1a1a54"
        zIndex={100}
      >
        {/* Modal content container */}
        <box width={60} backgroundColor="#1a1a1a" flexDirection="column">
          {/* Header */}
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
              Commands
            </text>
            <text fg="#888" attributes={TextAttributes.DIM}>
              esc
            </text>
          </box>

          {/* Commands Select */}
          <box flexGrow={1}>
            <select
              options={flatCommands.map((cmd) => ({
                name: cmd.name,
                description: cmd.description ?? '',
                value: cmd.id,
              }))}
              height={18}
              selectedIndex={selectedIndex()}
              flexGrow={1}
              itemSpacing={0.5}
              onSelect={(index, option) => {
                if (option) {
                  // TODO: Execute command later
                  console.log('Execute command:', option.value)
                  setIsOpen(false)
                }
              }}
              onChange={(index, option) => {
                setSelectedIndex(index)
              }}
              focused
            />
          </box>
        </box>
      </box>
    </Show>
  )
}

export default CommandPalette
