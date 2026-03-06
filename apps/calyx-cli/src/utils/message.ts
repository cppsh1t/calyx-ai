import { getFlowBuilder } from '@/services/useFlow'
import logger from '@/utils/logger'
import type { LanguageModelUsage } from 'ai'
import { PartialXMLStreamParser, type ParserOptions } from 'partial-xml-stream-parser'
import { isEmpty } from 'radash'
import { createMemo, createSignal, type Accessor } from 'solid-js'

const xmlparserOptions: ParserOptions = {
  textNodeName: 'text', // Default is "#text"
  attributeNamePrefix: '@', // Default is "@"
  alwaysCreateTextNode: true, // Default is true
  parsePrimitives: false, // Default is false
  stopNodes: [], // Default is empty
  maxDepth: null, // Default is null (no depth limit)
  allowedRootNodes: [], // Default is empty (parse all XML unconditionally)
}

export type Role = 'user' | 'assistant' | 'system'
const parser = new PartialXMLStreamParser(xmlparserOptions)

export type Message = {
  role: Role
  reason: string
  content: string
  usage: LanguageModelUsage | null
}

export type PendingMessage = Omit<Message, 'role' | 'usage'> & {
  running: boolean
}

const systemPrompt: Message = {
  role: 'system',
  reason: '',
  usage: null,
  content: `
  你是一个本地Cli助手，你需要严格遵守ReAct模式,用户会使用<task></task>来进行提问，你首先需要使用<thought></thought>思考做什么，其次你需要判断是否能直接回答，还是需要调用工具。
  如果可以直接回答，使用<answer></answer>包裹答案并返回。如果需要调用工具，使用<shell></shell>来编写bash命令执行。
  shell执行的结果，系统会在下一个对话中会通过<observation></observation>返回给你并且附带上之前的xml标签。你需要一直执行这个过程循环直到任务完成或者任务无法继续进行，以足够的信息来总结，使用<answer></answer>来包裹答案返回

  示例:

  \`\`\`xml
  <task>我在什么目录下?</task>
  <thought>用户问我现在的运行环境处在什么目录下，我需要执行bash的命令pwd来查看</thought>
  <shell>pwd</shell>
  <observation>/home/root</observation>
  <thought>看起来用户处于linux环境下root用户的根目录下，任务完成，让我来总结告诉用户</thought>
  <answer>已执行bash命令: pwd
  得到结果: /home/root
  您正处于linux环境下root用户的根目录下
  </answer>
  \`\`\`

  `,
}

const [messageHistory, setMessageHistory] = createSignal<Message[]>([systemPrompt])

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
  const convertMessages = messageHistory()
    .filter((item) => item.role !== 'system')
    .map((item) => ({ content: item.content, role: item.role, reason: item.reason, streaming: true, usage: item.usage }) as const)
  if (!pendingMessage().running) return convertMessages
  const pendingConvertMessage = {
    role: 'assistant',
    content: pendingMessage().content,
    streaming: true,
    reason: pendingMessage().reason,
    usage: null,
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
  prompt = `<task>${prompt}<task>`
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
    const result = flow.run(messageHistory())
    for await (const chunk of result.fullStream) {
      if (chunk.type === 'reasoning-delta') {
        updatePendingMessage({ reason: chunk.text })
      } else if (chunk.type === 'text-delta') {
        updatePendingMessage({ content: chunk.text })
      } else if (chunk.type === 'finish') {
        usage = chunk.totalUsage
      }
    }
    const assistantMessage: Message = { role: 'assistant', content: pendingMessage().content, reason: pendingMessage().reason, usage }
    stop(assistantMessage)
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Chat error')
    const exceptionMessage: Message = {
      role: 'assistant',
      reason: '',
      usage: null,
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
    stop(exceptionMessage)
  } finally {
    logger.info(`LLm stream completed`)
  }
}

function stop(assistantMessage: Message) {
  if (!pendingMessage().running) return
  logger.info('User stop chat')
  const parseResult = parser.parseStream(assistantMessage.content).xml
  //JSON.stringify(parseResult: [{"thought": {"text": "用户在查询当前目录"}}, {"shell"}: {"text": "pwd"}]

  let content = '测试\n'
  const thoughtItem = parseResult.find((item) => 'thought' in item)
  if (thoughtItem) {
    const thought = thoughtItem.thought.text
    content += `思考： ${thought}\n`
  }

  // 遍历数组查找 shell 节点
  const shellItem = parseResult.find((item) => 'shell' in item)
  if (shellItem) {
    const command = shellItem.shell.text
    content += `执行bash: ${command}\n`
    // 可选：实际执行命令
    // const result = await runCommand(command)
  }

  const newMsg = { ...assistantMessage, content }
  setPendingMessage(makeEmptyPendingMessage())
  appendMessageHistory(newMsg)
}

export { chat, combinedMessages, messageHistory, pendingMessage, stop }
