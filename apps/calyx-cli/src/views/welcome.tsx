import UserInput from '@/components/UserInput'
import { KeyBindPriorityEnum, useKeyBind } from '@/utils/keybind'
import logger from '@/utils/logger'
import { useRouter } from '@/views/router.tsx'
import { TextAttributes } from '@opentui/core'
import type { JSX } from 'solid-js'

export function WelcomeView(): JSX.Element {
  const { navigate, state } = useRouter()

  useKeyBind(KeyBindPriorityEnum.PAGE, (event) => {
    logger.info(`Key event in WelcomeView: ${event.name} (type: ${event.eventType})`)
    if (event.name === 'c') {
      navigate('chat')
      return { continue: false } // Stop propagation after handling
    }
    return { continue: true } // Allow other handlers to process
  })

  function handleUserInputSubmit(value: string) {
    logger.info(`User input submitted: ${value}`)
    navigate('chat')
  }

  return (
    <>
      <box alignItems="center" justifyContent="center" flexGrow={1} flexDirection="column">
        <box justifyContent="center" alignItems="flex-end">
          <ascii_font text="Calyx CLI" />
        </box>

        <box width={70} marginTop={2}>
          <UserInput onSubmit={handleUserInputSubmit} />
        </box>

      </box>
    </>
  )
}

export default WelcomeView
