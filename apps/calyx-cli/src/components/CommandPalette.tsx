import { flatCommands } from '@/utils/command'
import { useKeyboard } from '@opentui/solid'
import { registerLayer, ElementBindPriorityEnum } from '@/utils/layer'
import { TextAttributes } from '@opentui/core'
import { createSignal, on, onCleanup, Show, type JSX } from 'solid-js'

export function CommandPalette(): JSX.Element {
  const [isOpen, setIsOpen] = createSignal(false)
  const [selectedIndex, setSelectedIndex] = createSignal(0)

  const openCommandHelper = registerLayer({
    id: 'command-palette-open-command',
    filter: { name: 'p', ctrl: true, shift: false, meta: false },
    priority: ElementBindPriorityEnum.COMMAND,
  })

  onCleanup(() => {
    openCommandHelper.unregister()
  })

  // Ctrl+P to open command palette
  useKeyboard((event) => {
    if (!openCommandHelper.check()) return
    if (event.ctrl && event.name === 'p' && !isOpen()) {
      setIsOpen(true)
    }
  })

  // ESC to close
  useKeyboard((event) => {
    if (!openCommandHelper.check()) return
    if (event.name === 'escape' && isOpen()) {
      setIsOpen(false)
    }
  })

  return (
    <Show when={isOpen()}>
      {/* Modal overlay - full screen with centered content */}
      <box position="absolute" left={0} top={0} width="100%" height="100%" justifyContent="center" alignItems="center" backgroundColor="#1a1a1a54" zIndex={100}>
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
              onSelect={(index, option) => {
                if (option) {
                  // Find and execute the command handler
                  const command = flatCommands[index]
                  if (command?.handler) {
                    command.handler()
                  }
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
