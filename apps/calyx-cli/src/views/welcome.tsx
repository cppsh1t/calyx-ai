import UserInput from '@/components/UserInput'
import logger from '@/utils/logger'
import { chat } from '@/utils/message'
import { useRouter } from '@/views/router.tsx'
import { type JSX } from 'solid-js'

export function WelcomeView(): JSX.Element {
  const { navigate, state } = useRouter()

  function handleUserInputSubmit(prompt: string) {
    chat(prompt)
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
