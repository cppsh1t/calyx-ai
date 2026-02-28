import { createSignal } from 'solid-js'

export type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}


const [messageHistory, setMessageHistory] = createSignal<Message[]>([
  {
    role: 'user',
    content: 'Hello, how are you?',
  },
  {
    role: 'assistant',
    content: 'I am doing well, thank you! How can I assist you today?',
  },
])

export function addMessage(message: Message): void {
  setMessageHistory((prev) => [...prev, message])
}

export { messageHistory }
