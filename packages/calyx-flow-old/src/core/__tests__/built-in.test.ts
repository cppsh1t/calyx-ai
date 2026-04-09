import { anyAssertNodeDefinition, NodeRegistry, registerBuiltInNodes } from '@/core/index.ts'
import { None, Some } from '@/utils/structure'
import { describe, expect, it } from 'bun:test'
import { z } from 'zod'

describe('built-in nodes', () => {
  it('registers the any assert node', () => {
    const registry = new NodeRegistry()

    registerBuiltInNodes(registry)

    const entry = registry.get('built-in/any-assert')
    expect(entry).not.toBeNull()
    expect(entry?.definition).toBe(anyAssertNodeDefinition)
  })

  it('passes through any input value without changing it', async () => {
    const [executor] = anyAssertNodeDefinition.executors
    const payload = { nested: ['a', 1, true] }

    const result = await executor!.func({
      inputs: Some([
        {
          id: 'input',
          name: 'input',
          description: 'input',
          schema: z.any(),
          value: Some(payload),
        },
      ]),
      parameters: None,
      abort: new AbortController(),
    })

    expect(result.continue).toBe(true)
    expect(result.data).toEqual(payload)
  })
})
