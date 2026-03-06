import { getFlowBuilder } from '@/services/useFlow'
import logger from '@/utils/logger'
import { isEmpty } from 'radash'
import { createMemo, createSignal } from 'solid-js'

export type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type PendingMessage = {
  running: boolean
  content: string
}

const [messageHistory, setMessageHistory] = createSignal<Message[]>([])

const [pendingMessage, setPendingMessage] = createSignal<PendingMessage>({
  running: false,
  content: '',
})

export type CombinedMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
  streaming: boolean
}

const combinedMessages = createMemo(() => {
  const convertMessages = messageHistory().map((item) => ({ content: item.content, role: item.role, streaming: true }) as const)
  if (!pendingMessage().running) return convertMessages
  const pendingConvertMessage = {
    role: 'assistant',
    content: pendingMessage().content,
    streaming: true,
  } as const
  return [ ...convertMessages, pendingConvertMessage]
})

function appendMessageHistory(message: Message) {
  setMessageHistory([...messageHistory(), message])
}

function updatePendingMessage(chunk: string) {
  const msg = pendingMessage()
  setPendingMessage({
    ...msg,
    content: msg.content + chunk,
  })
}

async function chat(prompt: string) {
  if (isEmpty(prompt)) return
  if (pendingMessage().running) return
  logger.info(`User input submitted: ${prompt}`)
  const userMessage: Message = { role: 'user', content: prompt }
  appendMessageHistory(userMessage)
  setPendingMessage({
    running: true,
    content: '',
  })

  try {
    const flowBuilder = await getFlowBuilder()
    const flow = flowBuilder.build()

    logger.debug('Calling streamChat')
    const result = flow.run(prompt)
    for await (const chunk of result.textStream) {
      updatePendingMessage(chunk)
    }
    const assistantMessage: Message = { role: 'assistant', content: pendingMessage().content }
    stop(assistantMessage)
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Chat error')
    const exceptionMessage: Message = { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
    stop(exceptionMessage)
  } finally {
    logger.info(`LLm stream completed`)
  }
}

function stop(assistantMessage: Message) {
  if (!pendingMessage().running) return
  logger.info('User stop chat')
  setPendingMessage({ running: false, content: '' })
  appendMessageHistory(assistantMessage)
}

export { chat, combinedMessages, messageHistory, pendingMessage, stop }
