import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { LanguageModelUsage } from 'ai'
import type { PendingMessage } from '@/types/core/flow.ts'

type MockChunk = {
  type: string
  text?: string
  totalUsage?: LanguageModelUsage
  error?: unknown
}

const mockState: {
  chunks: MockChunk[]
  params: unknown[]
} = {
  chunks: [],
  params: [],
}

mock.module('ai', () => ({
  streamText: (param: unknown) => {
    mockState.params.push(param)

    return {
      fullStream: (async function* (): AsyncGenerator<MockChunk> {
        for (const chunk of mockState.chunks) {
          yield chunk
        }
      })(),
    }
  },
}))

const { streamAgent } = await import('@/utils/streamParse.ts')

async function collectMessages(
  chunks: MockChunk[],
  param: Record<string, unknown> = {},
): Promise<PendingMessage[]> {
  mockState.chunks = chunks
  const messages: PendingMessage[] = []

  for await (const message of streamAgent(param as never)) {
    messages.push(message)
  }

  return messages
}

describe('streamAgent', () => {
  beforeEach(() => {
    mockState.chunks = []
    mockState.params = []
  })

  it('parses mixed reasoning and tagged messages from streamed chunks', async () => {
    const messages = await collectMessages(
      [
        { type: 'reasoning-delta', text: 'Thinking...' },
        { type: 'text-delta', text: 'Hello <thought>plan' },
        { type: 'text-delta', text: ' more</thought><action>call' },
        { type: 'text-delta', text: 'Tool()</action><observation>ok</observation>' },
        { type: 'text-delta', text: '<answer>final</answer>' },
      ],
      { model: 'mock-model' },
    )

    expect(messages).toEqual([
      { type: 'reason', content: 'Thinking...' },
      { type: 'answer', content: 'Hello ' },
      { type: 'thought', content: 'plan' },
      { type: 'thought', content: ' more' },
      { type: 'action', content: 'callTool()' },
      { type: 'observation', content: 'ok' },
      { type: 'answer', content: 'final' },
    ])
  })

  it('handles open and close tags split across chunks', async () => {
    const messages = await collectMessages([
      { type: 'text-delta', text: 'Hi <tho' },
      { type: 'text-delta', text: 'ught>idea</th' },
      { type: 'text-delta', text: 'ought>!' },
    ])

    expect(messages).toEqual([
      { type: 'answer', content: 'Hi ' },
      { type: 'thought', content: 'idea' },
      { type: 'answer', content: '!' },
    ])
  })

  it('drops unfinished action content when closing tag never arrives', async () => {
    const messages = await collectMessages([{ type: 'text-delta', text: '<action>tool_name' }])
    expect(messages).toEqual([])
  })

  it('flushes unfinished non-action tag content at stream end', async () => {
    const messages = await collectMessages([{ type: 'text-delta', text: '<thought>unfinished' }])
    expect(messages).toEqual([{ type: 'thought', content: 'unfinished' }])
  })

  it('preserves partial open tags and emits remaining text at stream end', async () => {
    const messages = await collectMessages([{ type: 'text-delta', text: 'abc <thi' }])
    expect(messages).toEqual([
      { type: 'answer', content: 'abc ' },
      { type: 'answer', content: '<thi' },
    ])
  })

  it('emits usage message when receiving finish chunk', async () => {
    const totalUsage: LanguageModelUsage = {
      inputTokens: 12,
      inputTokenDetails: {
        noCacheTokens: 12,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
      outputTokens: 8,
      outputTokenDetails: {
        textTokens: 8,
        reasoningTokens: 0,
      },
      totalTokens: 20,
    }

    const messages = await collectMessages([{ type: 'finish', totalUsage }])

    expect(messages).toEqual([{ type: 'usage', content: totalUsage }])
  })

  it('wraps error chunk payload with json and returns as answer', async () => {
    const error = {
      code: 'E_STREAM',
      message: 'stream interrupted',
    }

    const messages = await collectMessages([{ type: 'error', error }])

    expect(messages).toEqual([
      { type: 'answer', content: JSON.stringify({ error }) },
    ])
  })

  it('passes through params to streamText', async () => {
    const param = { provider: 'fake', model: 'fake-model' }
    await collectMessages([], param)
    expect(mockState.params).toEqual([param])
  })
})

