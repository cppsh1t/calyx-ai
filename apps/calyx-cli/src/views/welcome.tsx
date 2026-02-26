import { CommandPalette } from '@/components/CommandPalette.tsx'
import { KeyBindPriorityEnum, useKeyBind } from '@/utils/keybind'
import logger from '@/utils/logger'
import { useRouter } from '@/views/router.tsx'
import { TextAttributes } from '@opentui/core'
import type { JSX } from 'solid-js'

export function WelcomeView(): JSX.Element {
  const { navigate, state } = useRouter()

  useKeyBind(KeyBindPriorityEnum.WELCOME, (event) => {
    logger.info(`Key event in WelcomeView: ${event.name} (type: ${event.eventType})`)
    if (event.name === 'c') {
      navigate('chat')
      return { continue: false } // Stop propagation after handling
    }
    return { continue: true } // Allow other handlers to process
  })

  return (
    <>
      <CommandPalette />
      <box alignItems="center" justifyContent="center" flexGrow={1} flexDirection="column">
        <box justifyContent="center" alignItems="flex-end">
          <ascii_font font="tiny" text="Calyx CLI" />
          <text attributes={TextAttributes.DIM}>AI-Powered Command Line Tool</text>
        </box>

        <box marginTop={2} flexDirection="column" alignItems="flex-start">
          <text attributes={TextAttributes.BOLD}>Configuration:</text>
          <text>continue: {String(state.config.continue)}</text>
          <text>sessionId: {state.config.sessionId}</text>
          <text>flow: {state.config.flowName}</text>
        </box>

        {/* Navigation to chat */}
        <box marginTop={2} border onMouseDown={() => navigate('chat')}>
          <text>[C]hat</text>
        </box>

        <text attributes={TextAttributes.DIM} marginTop={2}>
          Press Ctrl+C to exit
        </text>
      </box>
    </>
  )
}

export default WelcomeView
