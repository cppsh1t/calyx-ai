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

export function addAssistantMessage(): number {
  const newMessage: Message = { role: 'assistant', content: '' }
  let newIndex = 0
  setMessageHistory((prev) => {
    newIndex = prev.length
    return [...prev, newMessage]
  })
  return newIndex
}

export function updateLastMessage(content: string): void {
  setMessageHistory((prev) => {
    if (prev.length === 0) return prev
    const updated = [...prev]
    updated[updated.length - 1] = { ...updated[updated.length - 1]!, content }
    return updated
  })
}

export { messageHistory }
