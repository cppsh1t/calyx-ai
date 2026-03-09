import { getFlowBuilder } from '@/services/useFlow'
import logger from '@/utils/logger'
import type { LanguageModelUsage } from 'ai'
import { randomUUIDv7 } from 'bun'
import { PartialXMLStreamParser, type ParserOptions } from 'partial-xml-stream-parser'
import { isEmpty } from 'radash'
import { createMemo, createSignal, type Accessor } from 'solid-js'
import zod from 'zod'
import { runCommandToolParamZod } from './shell'

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
  id: string
  role: Role
  reason: string
  content: string
  usage: LanguageModelUsage | null
}

export type PendingMessage = Omit<Message, 'role' | 'usage' | 'id'> & {
  running: boolean
}

const textschema = zod.object({
  filePath: zod.string().meta({ description: '文件地址' }),
  line: zod.number().optional().meta({ description: '读取的行数, 不填则为所有行' }),
})

const systemPrompt: Message = {
  id: 'system',
  role: 'system',
  reason: '',
  usage: null,
  content: `
  <Role>
  你是calyx-cli，一个运行在本地终端的cli助手，可以调用工具或终端来帮助用户解决问题,严格遵循ReAct（推理-行动-观察）范式解决问题
  </Role>

  <Behaviour>
  ## 核心规则
  1. 必须通过<thought>→<action>→<observation>的迭代闭环处理问题，当任务完成或者无法继续进行，或者情况出现变化需要用户重新决策时输出<answer>；
  2. <action>可以调用工具，格式在下方；
  3. 每次仅输出一个<thought>+一个<action>（除非可直接输出<answer>），等待<observation>后再继续推理；
  4. 若工具调用失败/返回无效信息，需在<thought>中复盘并调整策略。
  5. <answer>的格式用户可以自定义，详细参考下文

  #### 工具格式
  根据系统提供的工具参数schema，填入到Action块中，示例:
  <action>
  {
    name: "writeToFile",
    argument: { //schema示例的格式
      fileName: "example.txt",
      content: "hello world"
    }
  }
  </action>
  ####

  #### 上下文格式
  系统会为每轮对话附带一个id，并在消息接受后进行裁剪。在你进行回复时，不要携带上一轮的历史内容。如果携带了上一轮的内容，也不要忘记id
  示例:

  <question id="first-xxxx-xxxx">我在什么目录下?</question>
  <thought id="first-xxxx-xxxx">
  用户问我现在程序运行在什么目录下，我需要调用bash工具来查看
  </thought id="first-xxxx-xxxx">
  <action id="first-xxxx-xxxx">
  {
    name: "bash",
    argument: {
      commands: "pwd"
    }
  }
  </action>

  <observation id="second-xxxx-xxxx">
  {
    success: true,
    error: null,
    result: {
      toolName: "bash",
      toolResult: "D:/project/front/vue-template"
    }
  }
  </observation>
  <thought id="second-xxxx-xxxx">
  根据工具调用结果，用户位于D:/project/front/vue-template，看起来是一个vue模板项目，我应该进行总结
  </thought>
  <answer id="second-xxxx-xxxx">
  您当前位于D:/project/front/vue-template，这应该时一个vue模板项目
  </answer>

  #### 当前自定义Answer输出格式
  当前<answer>格式为纯文本，没有复杂结构

  </Behaviour>

  <Tools>
  当前可用工具:
  1. bash
  schema(zod toJSONSchema, target: "openapi-3.0"): 
  ${JSON.stringify(
    runCommandToolParamZod.toJSONSchema({
      target: 'openapi-3.0',
    })
  )}

  2. readFile
  schema(zod toJSONSchema, target: "openapi-3.0"): 
  ${JSON.stringify(textschema.toJSONSchema({ target: 'openapi-3.0' }))}
  </Tools>
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
    .map((item) => ({ ...item, streaming: true }) as const)
  if (!pendingMessage().running) return convertMessages
  const pendingConvertMessage = {
    id: 'pending',
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

async function chat(prompt: string, bySystem = false) {
  if (isEmpty(prompt)) return
  if (pendingMessage().running) return
  logger.info(`User input submitted: ${prompt}`)
  const id = randomUUIDv7()
  if (bySystem) {
    prompt = `<observation id="${id}">${prompt} </observation>`
  } else {
    prompt = `<question id="${id}">${prompt}</question>`
  }

  const userMessage: Message = { id, role: 'user', content: prompt, reason: '', usage: null }
  appendMessageHistory(userMessage)
  setPendingMessage({
    running: true,
    reason: '',
    content: '',
  })

  try {
    const flowBuilder = await getFlowBuilder()
    const flow = await flowBuilder.build({ providerId: 'deepseek', modelId: 'deepseek-reasoner' })
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
    const assistantMessage: Message = { id, role: 'assistant', content: pendingMessage().content, reason: pendingMessage().reason, usage }
    await stop(assistantMessage)
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Chat error')
    const exceptionMessage: Message = {
      id,
      role: 'assistant',
      reason: '',
      usage: null,
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
    await stop(exceptionMessage)
  } finally {
    logger.info(`LLm stream completed`)
  }
}

function combineXml<T>(array: any[]) {
  return array.reduce(
    (acc, obj) => {
      const [key] = Object.keys(obj)
      acc[key as string] = obj[key as string]
      return acc
    },
    {} as Record<string, { text: string }>
  ) as Record<T & string, { text: string }>
}

async function stop(assistantMessage: Message) {
  if (!pendingMessage().running) return
  logger.info('User stop chat')
  const parseResult = parser.parseStream(assistantMessage.content).xml
  //JSON.stringify(parseResult: [{"thought": {"text": "用户在查询当前目录"}}, {"shell"}: {"text": "pwd"}]

  const combineObj = combineXml<'thought' | 'action' | 'answer'>(parseResult)

  let content = ''
  if (combineObj.thought) {
    content += `推理: ${combineObj.thought.text}\n`
  }

  let bashResult: string | null = null

  if (combineObj.action) {
    // content += `调用bash: ${combineObj.shell.text}\n`
    // bashResult = await runCommand(combineObj.shell.text)
    // content += `执行结果: ${bashResult}\n`
    content += `action:\n ${JSON.stringify(combineObj.action)} `
  }

  if (combineObj.answer) {
    content += `最终结果: ${combineObj.answer.text}\n`
  }

  content += `调试: ${JSON.stringify(combineObj)}`

  // const newMsg = { ...assistantMessage, content }
  setPendingMessage(makeEmptyPendingMessage())
  appendMessageHistory(assistantMessage)
  // if (bashResult && !combineObj.answer) {
  //   chat(bashResult, true)
  // }
}

export { chat, combinedMessages, messageHistory, pendingMessage, stop }
