import { createSignal } from 'solid-js'

export type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const [messageHistory, setMessageHistory] = createSignal<Message[]>([])

export function addMessage(message: Message): void {
  setMessageHistory((prev) => [...prev, message])
}
