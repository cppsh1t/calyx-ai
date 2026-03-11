import { buildProviderFactory } from '@/services/provider-factory.ts'
import {
  toolCallZod,
  type AssistantMessage,
  type FlowBuilder,
  type FlowConfig,
  type IFlow,
  type Message,
  type OriginMessage,
  type PendingMessage,
  type Tool,
  type ToolResult,
} from '@/types/core/flow.ts'
import type { Provider } from '@/types/services/provider-factory.ts'
import { formatHistory } from '@/utils/messageConverter.ts'
import { streamAgent } from '@/utils/streamParse.ts'
import { type LanguageModel } from 'ai'
import zod from 'zod'

const MAX_TOOL_LOOP_COUNT = 8

async function callTool(tool: Tool, param: any): Promise<ToolResult> {
  const schema = zod.fromJSONSchema(JSON.parse(tool.paramsSchema))
  const parseRes = schema.safeParse(param)
  if (parseRes.error) {
    return {
      tool: tool.name,
      status: 'schema verification failed',
      error: parseRes.error,
      result: null,
    }
  }

  try {
    const result = await tool.execute(parseRes.data)
    return { tool: tool.name, status: 'success', error: null, result }
  } catch (error) {
    return { tool: tool.name, status: 'error', error, result: null }
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch (error) {
    return JSON.stringify({
      error: 'failed_to_stringify',
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return safeStringify(error)
}

function serializePendingMessage(message: PendingMessage): string {
  switch (message.type) {
    case 'thought':
      return `<thought>${message.content}</thought>`
    case 'action':
      return `<action>${message.content}</action>`
    case 'observation':
      return `<observation>${message.content}</observation>`
    case 'answer':
      return `<answer>${message.content}</answer>`
    case 'reason':
    case 'usage':
      return ''
    default:
      return ''
  }
}

function toLoopHistoryContent(pendingMessages: PendingMessage[]): string {
  return pendingMessages
    .map((message) => serializePendingMessage(message))
    .filter((segment) => segment.length > 0)
    .join('')
}
function toRuntimeLoopMessages(pendingMessages: PendingMessage[]): OriginMessage[] {
  const assistantContent = pendingMessages
    .filter(
      (message) =>
        message.type === 'thought' || message.type === 'action' || message.type === 'answer',
    )
    .map((message) => serializePendingMessage(message))
    .filter((segment) => segment.length > 0)
    .join('')

  const observationContent = pendingMessages
    .filter((message) => message.type === 'observation')
    .map((message) => serializePendingMessage(message))
    .filter((segment) => segment.length > 0)
    .join('')

  const runtimeMessages: OriginMessage[] = []
  if (assistantContent.length > 0) {
    runtimeMessages.push({ role: 'assistant', content: assistantContent })
  }

  if (observationContent.length > 0) {
    runtimeMessages.push({ role: 'user', content: observationContent })
  }

  return runtimeMessages
}

function toAssistantMessage(pendingMessages: PendingMessage[]): AssistantMessage | null {
  const wrapperContent = toLoopHistoryContent(pendingMessages)

  const displayParts: string[] = []
  const reasonParts: string[] = []
  let usage: AssistantMessage['usage'] = null

  for (const message of pendingMessages) {
    switch (message.type) {
      case 'answer':
        displayParts.push(message.content)
        break
      case 'reason':
        reasonParts.push(message.content)
        break
      case 'usage':
        usage = message.content
        break
      default:
        break
    }
  }

  const displayContent = displayParts.join('')
  const reasonContent = reasonParts.join('')

  if (wrapperContent.length === 0 && displayContent.length === 0 && reasonContent.length === 0) {
    return null
  }

  return {
    role: 'assistant',
    wrapperContent: wrapperContent.length > 0 ? wrapperContent : displayContent,
    displayContent: displayContent.length > 0 ? displayContent : wrapperContent,
    reasonContent: reasonContent.length > 0 ? reasonContent : undefined,
    usage,
  }
}

class Flow implements IFlow {
  private model: LanguageModel
  private systemPrompt: string
  private tools: Tool[]
  private history: Message[]

  public constructor(model: LanguageModel, systemPrompt: string, history?: Message[], tools?: Tool[]) {
    this.model = model
    this.systemPrompt = systemPrompt
    this.tools = tools ?? []
    this.history = history ?? []
    this.systemPrompt += `
    \n\n
    <Tools>
    当前可用工具:
    ${this.tools.map((item, index) => `
      ${index+1}. ${item.name}
      description: ${item.description}
      schema: ${item.paramsSchema}
      `).join('\n')}
    </Tools>
    `
  }

  public getHistory() {
    return [...this.history]
  }

  private async *runLoop(messages: OriginMessage[]): AsyncGenerator<PendingMessage, PendingMessage[], void> {
    const stream = streamAgent({
      model: this.model,
      messages,
    })

    const loopMessages: PendingMessage[] = []

    for await (const chunk of stream) {
      loopMessages.push(chunk)
      yield chunk

      if (chunk.type !== 'action') {
        continue
      }

      let parsedActionPayload: unknown
      try {
        parsedActionPayload = JSON.parse(chunk.content)
      } catch (error) {
        const parseErrorMessage: PendingMessage = {
          type: 'observation',
          content: safeStringify({
            tool: 'unknown',
            status: 'action parse failed',
            error: stringifyError(error),
            result: null,
          }),
        }

        loopMessages.push(parseErrorMessage)
        yield parseErrorMessage
        return loopMessages
      }

      const toolCallRes = toolCallZod.safeParse(parsedActionPayload)
      if (toolCallRes.error) {
        const schemaErrorMessage: PendingMessage = {
          type: 'observation',
          content: safeStringify({
            tool: 'unknown',
            status: 'schema verification failed',
            error: toolCallRes.error.flatten(),
            result: null,
          }),
        }

        loopMessages.push(schemaErrorMessage)
        yield schemaErrorMessage
        return loopMessages
      }

      const selectedTool = this.tools.find((item) => item.name === toolCallRes.data.tool)
      if (!selectedTool) {
        const missingToolMessage: PendingMessage = {
          type: 'observation',
          content: safeStringify({
            tool: toolCallRes.data.tool,
            status: 'tool not found',
            error: `Tool '${toolCallRes.data.tool}' not found`,
            result: null,
          }),
        }

        loopMessages.push(missingToolMessage)
        yield missingToolMessage
        return loopMessages
      }

      const result = await callTool(selectedTool, toolCallRes.data.arguments)
      const observationMessage: PendingMessage = {
        type: 'observation',
        content: safeStringify(result),
      }

      loopMessages.push(observationMessage)
      yield observationMessage
      return loopMessages
    }

    return loopMessages
  }

  public async *run(): AsyncGenerator<PendingMessage, void, void> {
    const allPendingMessages: PendingMessage[] = []
    const runtimeHistory: OriginMessage[] = formatHistory(this.systemPrompt, this.history)

    let shouldContinue = true
    let loopCount = 0

    while (shouldContinue && loopCount < MAX_TOOL_LOOP_COUNT) {
      const loopPendingMessages: PendingMessage[] = []
      let hasAction = false

      for await (const pendingMessage of this.runLoop(runtimeHistory)) {
        loopPendingMessages.push(pendingMessage)
        allPendingMessages.push(pendingMessage)
        yield pendingMessage

        if (pendingMessage.type === 'action') {
          hasAction = true
        }
      }

      if (!hasAction) {
        shouldContinue = false
        break
      }

      const runtimeLoopMessages = toRuntimeLoopMessages(loopPendingMessages)
      if (runtimeLoopMessages.length > 0) {
        runtimeHistory.push(...runtimeLoopMessages)
      }

      loopCount += 1
    }

    if (shouldContinue && loopCount >= MAX_TOOL_LOOP_COUNT) {
      const loopLimitMessage: PendingMessage = {
        type: 'observation',
        content: safeStringify({
          tool: 'system',
          status: 'error',
          error: `max tool loop count reached: ${MAX_TOOL_LOOP_COUNT}`,
          result: null,
        }),
      }

      allPendingMessages.push(loopLimitMessage)
      yield loopLimitMessage
    }

    const assistantMessage = toAssistantMessage(allPendingMessages)
    if (assistantMessage) {
      this.history.push(assistantMessage)
    }
  }
}

async function createFlowBuilder(providerConfig: Record<string, Provider>): Promise<FlowBuilder> {
  const providerFactory = buildProviderFactory(providerConfig)

  const builder: FlowBuilder = {
    async build(config: FlowConfig) {
      const provider = await providerFactory.makeProvider(config.providerId)
      const model = provider.languageModel(config.modelId)
      return new Flow(model, config.systemPrompt, config.history, config.tools)
    },
  }
  return builder
}

export { createFlowBuilder, Flow }


