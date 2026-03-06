import { getFlowBuilder } from '@/services/useFlow'
import logger from '@/utils/logger'
import type { LanguageModelUsage } from 'ai'
import { isEmpty } from 'radash'
import { createMemo, createSignal, type Accessor } from 'solid-js'

export type Role = 'user' | 'assistant' | 'system'

export type Message = {
  role: Role
  reason: string
  content: string
  usage: LanguageModelUsage | null
}

export type PendingMessage = Omit<Message, "role" | "usage"> & {
  running: boolean
}

const [messageHistory, setMessageHistory] = createSignal<Message[]>([])

const [pendingMessage, setPendingMessage] = createSignal<PendingMessage>(makeEmptyPendingMessage())

export type CombinedMessage = Message & {
  streaming: boolean
}

function makeEmptyPendingMessage(): PendingMessage {
  return {
    running: false,
    reason: '',
    content: '',
  }
}

const combinedMessages: Accessor<CombinedMessage[]> = createMemo(() => {
  const convertMessages = messageHistory().map((item) => ({ content: item.content, role: item.role, reason: item.reason, streaming: true, usage: item.usage }) as const)
  if (!pendingMessage().running) return convertMessages
  const pendingConvertMessage = {
    role: 'assistant',
    content: pendingMessage().content,
    streaming: true,
    reason: pendingMessage().reason,
    usage: null
  } as const
  return [...convertMessages, pendingConvertMessage]
})

function appendMessageHistory(message: Message) {
  setMessageHistory([...messageHistory(), message])
}

function updatePendingMessage(combineText: { content?: string; reason?: string }) {
  const msg = pendingMessage()
  if (combineText.content) {
    setPendingMessage({
      ...msg,
      content: msg.content + combineText.content,
    })
  } else {
    setPendingMessage({
      ...msg,
      reason: msg.reason + combineText.reason,
    })
  }
}

async function chat(prompt: string) {
  if (isEmpty(prompt)) return
  if (pendingMessage().running) return
  logger.info(`User input submitted: ${prompt}`)
  const userMessage: Message = { role: 'user', content: prompt, reason: '', usage: null }
  appendMessageHistory(userMessage)
  setPendingMessage({
    running: true,
    reason: '',
    content: '',
  })

  try {
    const flowBuilder = await getFlowBuilder()
    const flow = flowBuilder.build()
    let usage: LanguageModelUsage | null = null

    logger.debug('Calling streamChat')
    const result = flow.run(prompt, messageHistory())
    for await (const chunk of result.fullStream) {
      if (chunk.type === 'reasoning-delta') {
        updatePendingMessage({reason: chunk.text})
      } else if (chunk.type === 'text-delta') {
        updatePendingMessage({content: chunk.text})
      } else if (chunk.type === 'finish') {
        usage = chunk.totalUsage
      }
    }
    const assistantMessage: Message = { role: 'assistant', content: pendingMessage().content, reason: pendingMessage().reason, usage }
    stop(assistantMessage)
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Chat error')
    const exceptionMessage: Message = { role: 'assistant', reason: '', usage: null, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
    stop(exceptionMessage)
  } finally {
    logger.info(`LLm stream completed`)
  }
}

function stop(assistantMessage: Message) {
  if (!pendingMessage().running) return
  logger.info('User stop chat')
  setPendingMessage(makeEmptyPendingMessage())
  appendMessageHistory(assistantMessage)
}

export { chat, combinedMessages, messageHistory, pendingMessage, stop }
