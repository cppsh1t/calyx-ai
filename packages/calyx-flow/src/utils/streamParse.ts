import { streamText } from 'ai'
import type { OriginPendingMessageType, PendingMessage } from '@/types/core/flow.ts'

type Param = Parameters<typeof streamText>[0]

type ReActMessageType = Exclude<OriginPendingMessageType, 'reason'>

type TagDefinition = {
  open: string
  closes: readonly string[]
  type: ReActMessageType
}

type OpenTagMatch = {
  index: number
  openTag: string
  type: ReActMessageType
}

type CloseTagMatch = {
  index: number
  closeTag: string
}

const TAG_DEFINITIONS: readonly TagDefinition[] = [
  { open: '<thought>', closes: ['</thought>', '</think>'], type: 'thought' },
  { open: '<think>', closes: ['</think>', '</thought>'], type: 'thought' },
  { open: '<action>', closes: ['</action>'], type: 'action' },
  { open: '<observation>', closes: ['</observation>'], type: 'observation' },
  { open: '<answer>', closes: ['</answer>'], type: 'answer' },
]

const OPEN_TAGS = TAG_DEFINITIONS.map((definition) => definition.open)

const CLOSE_TAGS_BY_TYPE: Record<ReActMessageType, readonly string[]> = {
  thought: ['</thought>', '</think>'],
  action: ['</action>'],
  observation: ['</observation>'],
  answer: ['</answer>'],
}

function findNextOpenTag(buffer: string): OpenTagMatch | null {
  let match: OpenTagMatch | null = null

  for (const definition of TAG_DEFINITIONS) {
    const index = buffer.indexOf(definition.open)
    if (index < 0) {
      continue
    }

    if (match === null || index < match.index) {
      match = { index, openTag: definition.open, type: definition.type }
    }
  }

  return match
}

function findNextCloseTag(buffer: string, closeTags: readonly string[]): CloseTagMatch | null {
  let match: CloseTagMatch | null = null

  for (const closeTag of closeTags) {
    const index = buffer.indexOf(closeTag)
    if (index < 0) {
      continue
    }

    if (match === null || index < match.index) {
      match = { index, closeTag }
    }
  }

  return match
}

function getTailLengthToPreserve(buffer: string, candidates: readonly string[]): number {
  if (buffer.length === 0) {
    return 0
  }

  const maxCandidateLength = Math.max(...candidates.map((candidate) => candidate.length))
  const maxCheckLength = Math.min(buffer.length, Math.max(0, maxCandidateLength - 1))

  for (let length = maxCheckLength; length > 0; length--) {
    const suffix = buffer.slice(-length)
    const isPrefix = candidates.some(
      (candidate) => suffix.length < candidate.length && candidate.startsWith(suffix),
    )

    if (isPrefix) {
      return length
    }
  }

  return 0
}

function toJsonString(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch (error) {
    return JSON.stringify({
      error: 'failed_to_stringify',
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return error
}
export async function* streamAgent(param: Param): AsyncGenerator<PendingMessage> {
  const streamResult = streamText(param)

  let buffer = ''
  let activeType: ReActMessageType | null = null
  let actionBuffer = ''

  for await (const chunk of streamResult.fullStream) {
    switch (chunk.type) {
      case 'reasoning-delta': {
        if (chunk.text.length > 0) {
          yield { type: 'reason', content: chunk.text }
        }
        break
      }

      case 'text-delta': {
        if (chunk.text.length === 0) {
          break
        }

        buffer += chunk.text

        while (buffer.length > 0) {
          if (activeType === null) {
            const openTagMatch = findNextOpenTag(buffer)
            if (openTagMatch === null) {
              const keepLength = getTailLengthToPreserve(buffer, OPEN_TAGS)
              const stableText = buffer.slice(0, buffer.length - keepLength)
              if (stableText.length > 0) {
                yield { type: 'answer', content: stableText }
              }
              buffer = buffer.slice(buffer.length - keepLength)
              break
            }

            const leadingText = buffer.slice(0, openTagMatch.index)
            if (leadingText.length > 0) {
              yield { type: 'answer', content: leadingText }
            }

            buffer = buffer.slice(openTagMatch.index + openTagMatch.openTag.length)
            activeType = openTagMatch.type
            continue
          }

          const closeTags = CLOSE_TAGS_BY_TYPE[activeType]
          const closeTagMatch = findNextCloseTag(buffer, closeTags)

          if (closeTagMatch !== null) {
            const segment = buffer.slice(0, closeTagMatch.index)

            if (activeType === 'action') {
              actionBuffer += segment
              if (actionBuffer.length > 0) {
                yield { type: 'action', content: actionBuffer }
              }
              actionBuffer = ''
            } else if (segment.length > 0) {
              yield { type: activeType, content: segment }
            }

            buffer = buffer.slice(closeTagMatch.index + closeTagMatch.closeTag.length)
            activeType = null
            continue
          }

          const keepLength = getTailLengthToPreserve(buffer, closeTags)
          const stableText = buffer.slice(0, buffer.length - keepLength)

          if (activeType === 'action') {
            actionBuffer += stableText
          } else if (stableText.length > 0) {
            yield { type: activeType, content: stableText }
          }

          buffer = buffer.slice(buffer.length - keepLength)
          break
        }

        break
      }

      case 'finish': {
        yield { type: 'usage', content: chunk.totalUsage ?? null }
        break
      }

      case 'error': {
        yield {
          type: 'answer',
          content: toJsonString({ error: serializeError(chunk.error) }),
        }
        break
      }

      default:
        break
    }
  }

  if (activeType === null) {
    if (buffer.length > 0) {
      yield { type: 'answer', content: buffer }
    }
    return
  }

  if (activeType === 'action') {
    return
  }

  if (buffer.length > 0) {
    yield { type: activeType, content: buffer }
  }
}


