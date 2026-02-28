import { KeyBindPriorityEnum, useKeyBind } from '@/utils/keybind'
import { useRouter } from '@/views/router.tsx'
import type { JSX } from 'solid-js'
import { createSignal } from 'solid-js'


export function ChatView(): JSX.Element {
  // Input value signal for reactive state
  const [message, setMessage] = createSignal('')

  const { navigate, state } = useRouter()
  // Router navigation
  useKeyBind(KeyBindPriorityEnum.PAGE, (event) => {
    if (event.name === 'escape') {
      navigate('welcome')
      return { continue: false } // Stop propagation after handling
    } else {
      return { continue: true } // Allow other handlers to process
    }
  })

  return (
    <box flexDirection="column" flexGrow={1} justifyContent="center" width='100%' padding={1}>


      {/* Instructions */}
      <text marginTop={1} fg="#888">
        Press Escape to return to welcome
      </text>


    </box>
  )
}

export default ChatView
