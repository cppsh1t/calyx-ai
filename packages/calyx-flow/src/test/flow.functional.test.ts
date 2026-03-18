import { createFlow, runFlow } from '@/core/flow.ts'
import { NodeRegistry } from '@/core/registry.ts'
import type { NodeDefinition, NodeEmitterEvent } from '@/types'
import { None, Some } from '@/utils/structure.ts'
import { describe, expect, test } from 'bun:test'
import z from 'zod'

const sleep = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

const makeInput = (id: string, schema: z.ZodType): NodeDefinition['inputs'] => {
  return Some([
    {
      id,
      name: id,
      schema,
      direction: 'input' as const,
      description: `${id} input`,
      value: None,
    },
  ]) as NodeDefinition['inputs']
}

const makeOutput = (id: string, schema: z.ZodType): NodeDefinition['outputs'] => {
  return Some([
    {
      id,
      name: id,
      schema,
      direction: 'output',
      description: `${id} output`,
      value: None,
    },
  ])
}

const registerNode = (registry: NodeRegistry, key: `${string}/${string}`, definition: NodeDefinition): void => {
  registry.register(key, definition)
}

describe('calyx-flow functional runtime', () => {
  test('createFlow builds nodes/edges and keeps emitter', () => {
    const registry = new NodeRegistry()
    const events: NodeEmitterEvent[] = []

    registerNode(registry, 'demo/start', {
      name: 'Start',
      description: 'start node',
      position: { x: 0, y: 0 },
      symbol: Some('start'),
      group: None,
      parameters: None,
      inputs: None,
      outputs: makeOutput('out', z.string()),
      executor: {
        async execute() {},
      },
    })

    registerNode(registry, 'demo/end', {
      name: 'End',
      description: 'end node',
      position: { x: 200, y: 0 },
      symbol: None,
      group: None,
      parameters: None,
      inputs: makeInput('in', z.string()),
      outputs: None,
      executor: {
        async execute() {},
      },
    })

    const flow = createFlow(
      {
        name: 'f1',
        nodes: [
          {
            id: 'n1',
            key: 'demo/start',
            name: 'Start',
            description: 'start',
            position: { x: 0, y: 0 },
            outputs: [{ id: 'out', value: 'hello' }],
          },
          {
            id: 'n2',
            key: 'demo/end',
            name: 'End',
            description: 'end',
            position: { x: 200, y: 0 },
            inputs: [{ id: 'in', value: 'seed' }],
          },
        ],
        edges: [{ from: { nodeId: 'n1', portId: 'out' }, to: { nodeId: 'n2', portId: 'in' } }],
      },
      registry,
      (event) => events.push(event)
    )

    expect(flow.name).toBe('f1')
    expect(flow.nodes.type).toBe('Some')
    expect(flow.edges.type).toBe('Some')
    expect(flow.emitter).toBeDefined()
    expect(events.length).toBe(0)
  })

  test('createFlow throws on invalid flow object', () => {
    const registry = new NodeRegistry()
    expect(() => createFlow({ name: 'bad', nodes: 'not-array' }, registry)).toThrow('Invalid Flow object')
  })

  test('createFlow throws when node key is not registered', () => {
    const registry = new NodeRegistry()

    expect(() =>
      createFlow(
        {
          name: 'f2',
          nodes: [
            {
              id: 'n1',
              key: 'missing/key',
              name: 'Missing',
              description: 'x',
              position: { x: 0, y: 0 },
            },
          ],
        },
        registry
      )
    ).toThrow('NodeDefinition not found for key')
  })

  test('runFlow executes from start symbol and routes outputs to inputs', async () => {
    const registry = new NodeRegistry()
    const received: string[] = []

    registerNode(registry, 'demo/start', {
      name: 'Start',
      description: 'start node',
      position: { x: 0, y: 0 },
      symbol: Some('start'),
      group: None,
      parameters: None,
      inputs: None,
      outputs: makeOutput('out', z.string()),
      executor: {
        async execute(ctx) {
          if (ctx.outputs.type === 'Some') {
            const out = ctx.outputs.value.find((port) => port.id === 'out')
            if (out) {
              out.value = Some('hello')
            }
          }
        },
      },
    })

    registerNode(registry, 'demo/end', {
      name: 'End',
      description: 'end node',
      position: { x: 200, y: 0 },
      symbol: None,
      group: None,
      parameters: None,
      inputs: makeInput('in', z.string()),
      outputs: None,
      executor: {
        async execute(ctx) {
          if (ctx.inputs.type === 'Some') {
            const incoming = ctx.inputs.value.find((port) => port.id === 'in')
            if (incoming?.value.type === 'Some') {
              received.push(String(incoming.value.value))
            }
          }
        },
      },
    })

    const flow = createFlow(
      {
        name: 'flow-route',
        nodes: [
          {
            id: 'start-node',
            key: 'demo/start',
            name: 'Start',
            description: 'start',
            position: { x: 0, y: 0 },
            outputs: [{ id: 'out', value: 'ignored' }],
          },
          {
            id: 'end-node',
            key: 'demo/end',
            name: 'End',
            description: 'end',
            position: { x: 200, y: 0 },
            inputs: [{ id: 'in', value: '' }],
          },
        ],
        edges: [{ from: { nodeId: 'start-node', portId: 'out' }, to: { nodeId: 'end-node', portId: 'in' } }],
      },
      registry
    )

    const result = await runFlow(flow, 'start')
    expect(result.status).toBe('completed')
    expect(received).toEqual(['hello'])
  })

  test('runFlow triggers a node executor for each input activation', async () => {
    const registry = new NodeRegistry()
    let mergeRuns = 0

    registerNode(registry, 'demo/start', {
      name: 'Start',
      description: 'start node',
      position: { x: 0, y: 0 },
      symbol: Some('start'),
      group: None,
      parameters: None,
      inputs: None,
      outputs: Some([
        { id: 'a', name: 'a', schema: z.string(), direction: 'output', description: 'a', value: None },
        { id: 'b', name: 'b', schema: z.string(), direction: 'output', description: 'b', value: None },
      ]),
      executor: {
        async execute(ctx) {
          if (ctx.outputs.type === 'Some') {
            const a = ctx.outputs.value.find((p) => p.id === 'a')
            const b = ctx.outputs.value.find((p) => p.id === 'b')
            if (a) a.value = Some('x')
            if (b) b.value = Some('y')
          }
        },
      },
    })

    registerNode(registry, 'demo/merge', {
      name: 'Merge',
      description: 'merge node',
      position: { x: 300, y: 0 },
      symbol: None,
      group: None,
      parameters: None,
      inputs: makeInput('in', z.string()),
      outputs: None,
      executor: {
        async execute() {
          mergeRuns += 1
        },
      },
    })

    const flow = createFlow(
      {
        name: 'flow-multi-activation',
        nodes: [
          {
            id: 's',
            key: 'demo/start',
            name: 'Start',
            description: 'start',
            position: { x: 0, y: 0 },
            outputs: [
              { id: 'a', value: '' },
              { id: 'b', value: '' },
            ],
          },
          { id: 'm', key: 'demo/merge', name: 'Merge', description: 'merge', position: { x: 300, y: 0 }, inputs: [{ id: 'in', value: '' }] },
        ],
        edges: [
          { from: { nodeId: 's', portId: 'a' }, to: { nodeId: 'm', portId: 'in' } },
          { from: { nodeId: 's', portId: 'b' }, to: { nodeId: 'm', portId: 'in' } },
        ],
      },
      registry
    )

    const result = await runFlow(flow, 'start')
    expect(result.status).toBe('completed')
    expect(mergeRuns).toBe(2)
  })

  test('runFlow executes independent downstream nodes in parallel', async () => {
    const registry = new NodeRegistry()
    const startedAt: Record<string, number> = {}

    registerNode(registry, 'demo/start', {
      name: 'Start',
      description: 'start node',
      position: { x: 0, y: 0 },
      symbol: Some('start'),
      group: None,
      parameters: None,
      inputs: None,
      outputs: makeOutput('out', z.string()),
      executor: {
        async execute(ctx) {
          if (ctx.outputs.type === 'Some') {
            const out = ctx.outputs.value.find((port) => port.id === 'out')
            if (out) {
              out.value = Some('go')
            }
          }
        },
      },
    })

    const slowNode = (name: string): NodeDefinition => ({
      name,
      description: `${name} worker`,
      position: { x: 200, y: 0 },
      symbol: None,
      group: None,
      parameters: None,
      inputs: makeInput('in', z.string()),
      outputs: None,
      executor: {
        async execute() {
          startedAt[name] = Date.now()
          await sleep(80)
        },
      },
    })

    registerNode(registry, 'demo/left', slowNode('left'))
    registerNode(registry, 'demo/right', slowNode('right'))

    const flow = createFlow(
      {
        name: 'flow-parallel',
        nodes: [
          { id: 's', key: 'demo/start', name: 'Start', description: 'start', position: { x: 0, y: 0 }, outputs: [{ id: 'out', value: '' }] },
          { id: 'l', key: 'demo/left', name: 'Left', description: 'left', position: { x: 200, y: 0 }, inputs: [{ id: 'in', value: '' }] },
          { id: 'r', key: 'demo/right', name: 'Right', description: 'right', position: { x: 200, y: 120 }, inputs: [{ id: 'in', value: '' }] },
        ],
        edges: [
          { from: { nodeId: 's', portId: 'out' }, to: { nodeId: 'l', portId: 'in' } },
          { from: { nodeId: 's', portId: 'out' }, to: { nodeId: 'r', portId: 'in' } },
        ],
      },
      registry
    )

    const started = Date.now()
    const result = await runFlow(flow, 'start')
    const duration = Date.now() - started

    expect(result.status).toBe('completed')
    expect(startedAt.left).toBeDefined()
    expect(startedAt.right).toBeDefined()
    expect(Math.abs((startedAt.left ?? 0) - (startedAt.right ?? 0))).toBeLessThan(40)
    expect(duration).toBeLessThan(150)
  })

  test('runFlow returns aborted when external signal is already aborted', async () => {
    const registry = new NodeRegistry()

    registerNode(registry, 'demo/start', {
      name: 'Start',
      description: 'start node',
      position: { x: 0, y: 0 },
      symbol: Some('start'),
      group: None,
      parameters: None,
      inputs: None,
      outputs: None,
      executor: {
        async execute() {
          throw new Error('should not execute when already aborted')
        },
      },
    })

    const flow = createFlow(
      {
        name: 'flow-aborted-before-start',
        nodes: [{ id: 's', key: 'demo/start', name: 'Start', description: 'start', position: { x: 0, y: 0 } }],
      },
      registry
    )

    const controller = new AbortController()
    controller.abort('stop-now')

    const result = await runFlow(flow, 'start', { signal: controller.signal })
    expect(result.status).toBe('aborted')
  })

  test('runFlow stops downstream scheduling after external abort during execution', async () => {
    const registry = new NodeRegistry()
    const received: string[] = []

    registerNode(registry, 'demo/start', {
      name: 'Start',
      description: 'start node',
      position: { x: 0, y: 0 },
      symbol: Some('start'),
      group: None,
      parameters: None,
      inputs: None,
      outputs: makeOutput('out', z.string()),
      executor: {
        async execute(ctx) {
          await sleep(80)
          if (ctx.outputs.type === 'Some') {
            const out = ctx.outputs.value.find((port) => port.id === 'out')
            if (out) {
              out.value = Some('late-value')
            }
          }
        },
      },
    })

    registerNode(registry, 'demo/end', {
      name: 'End',
      description: 'end node',
      position: { x: 240, y: 0 },
      symbol: None,
      group: None,
      parameters: None,
      inputs: makeInput('in', z.string()),
      outputs: None,
      executor: {
        async execute(ctx) {
          if (ctx.inputs.type === 'Some') {
            const incoming = ctx.inputs.value.find((port) => port.id === 'in')
            if (incoming?.value.type === 'Some') {
              received.push(String(incoming.value.value))
            }
          }
        },
      },
    })

    const flow = createFlow(
      {
        name: 'flow-abort-mid-run',
        nodes: [
          { id: 's', key: 'demo/start', name: 'Start', description: 'start', position: { x: 0, y: 0 }, outputs: [{ id: 'out', value: '' }] },
          { id: 'e', key: 'demo/end', name: 'End', description: 'end', position: { x: 240, y: 0 }, inputs: [{ id: 'in', value: '' }] },
        ],
        edges: [{ from: { nodeId: 's', portId: 'out' }, to: { nodeId: 'e', portId: 'in' } }],
      },
      registry
    )

    const controller = new AbortController()
    const runPromise = runFlow(flow, 'start', { signal: controller.signal })

    await sleep(15)
    controller.abort('external-stop')

    const result = await runPromise
    expect(result.status).toBe('aborted')
    expect(received).toEqual([])
  })

  test('runFlow throws when start symbol is missing or duplicated', async () => {
    const registry = new NodeRegistry()

    registerNode(registry, 'demo/start', {
      name: 'Start',
      description: 'start node',
      position: { x: 0, y: 0 },
      symbol: Some('start'),
      group: None,
      parameters: None,
      inputs: None,
      outputs: None,
      executor: { async execute() {} },
    })

    const missingStartFlow = createFlow(
      {
        name: 'missing-start',
        nodes: [{ id: 's1', key: 'demo/start', name: 'Start', description: 'start', position: { x: 0, y: 0 }, symbol: 'other' }],
      },
      registry
    )

    await expect(runFlow(missingStartFlow, 'start')).rejects.toThrow('Start node not found')

    const duplicateStartFlow = createFlow(
      {
        name: 'duplicate-start',
        nodes: [
          { id: 's1', key: 'demo/start', name: 'Start1', description: 'start1', position: { x: 0, y: 0 }, symbol: 'start' },
          { id: 's2', key: 'demo/start', name: 'Start2', description: 'start2', position: { x: 80, y: 0 }, symbol: 'start' },
        ],
      },
      registry
    )

    await expect(runFlow(duplicateStartFlow, 'start')).rejects.toThrow('Multiple start nodes found')
  })

  test('runFlow validates output and input schema during propagation', async () => {
    const registry = new NodeRegistry()

    registerNode(registry, 'demo/bad-output', {
      name: 'BadOutput',
      description: 'invalid output node',
      position: { x: 0, y: 0 },
      symbol: Some('start'),
      group: None,
      parameters: None,
      inputs: None,
      outputs: makeOutput('out', z.string()),
      executor: {
        async execute(ctx) {
          if (ctx.outputs.type === 'Some') {
            const out = ctx.outputs.value.find((p) => p.id === 'out')
            if (out) {
              out.value = Some(123)
            }
          }
        },
      },
    })

    const badOutputFlow = createFlow(
      {
        name: 'bad-output-flow',
        nodes: [{ id: 'n1', key: 'demo/bad-output', name: 'BadOutput', description: 'x', position: { x: 0, y: 0 }, outputs: [{ id: 'out', value: '' }] }],
      },
      registry
    )

    await expect(runFlow(badOutputFlow, 'start')).rejects.toThrow('Invalid output value')

    registerNode(registry, 'demo/good-start', {
      name: 'GoodStart',
      description: 'good start node',
      position: { x: 0, y: 0 },
      symbol: Some('go'),
      group: None,
      parameters: None,
      inputs: None,
      outputs: makeOutput('out', z.string()),
      executor: {
        async execute(ctx) {
          if (ctx.outputs.type === 'Some') {
            const out = ctx.outputs.value.find((p) => p.id === 'out')
            if (out) {
              out.value = Some('text')
            }
          }
        },
      },
    })

    registerNode(registry, 'demo/number-input', {
      name: 'NumberInput',
      description: 'number input node',
      position: { x: 240, y: 0 },
      symbol: None,
      group: None,
      parameters: None,
      inputs: makeInput('in', z.number()),
      outputs: None,
      executor: { async execute() {} },
    })

    const badInputFlow = createFlow(
      {
        name: 'bad-input-flow',
        nodes: [
          { id: 's', key: 'demo/good-start', name: 'GoodStart', description: 'start', position: { x: 0, y: 0 }, outputs: [{ id: 'out', value: '' }] },
          { id: 'n', key: 'demo/number-input', name: 'NumberInput', description: 'num', position: { x: 240, y: 0 }, inputs: [{ id: 'in', value: 0 }] },
        ],
        edges: [{ from: { nodeId: 's', portId: 'out' }, to: { nodeId: 'n', portId: 'in' } }],
      },
      registry
    )

    await expect(runFlow(badInputFlow, 'go')).rejects.toThrow('Invalid input value')
  })

  test('executor can emit runtime events through ctx.emitter', async () => {
    const registry = new NodeRegistry()
    const events: NodeEmitterEvent[] = []

    registerNode(registry, 'demo/start', {
      name: 'Start',
      description: 'start node',
      position: { x: 0, y: 0 },
      symbol: Some('start'),
      group: None,
      parameters: None,
      inputs: None,
      outputs: None,
      executor: {
        async execute(ctx) {
          ctx.emitter({
            type: 'node.executed',
            node: ctx.node,
            data: { executed: true, id: ctx.node.id },
          })
        },
      },
    })

    const flow = createFlow(
      {
        name: 'flow-events',
        nodes: [{ id: 's', key: 'demo/start', name: 'Start', description: 'start', position: { x: 0, y: 0 } }],
      },
      registry,
      (event) => events.push(event)
    )

    const result = await runFlow(flow, 'start')
    expect(result.status).toBe('completed')
    expect(events.length).toBe(1)
    expect(events[0]?.type).toBe('node.executed')
    expect(events[0]?.node.id).toBe('s')
    expect(events[0]?.data).toEqual({ executed: true, id: 's' })
  })

  test('flow objects can omit node ports and still use registry definitions at runtime', async () => {
    const registry = new NodeRegistry()
    const received: string[] = []

    registerNode(registry, 'demo/start', {
      name: 'Start',
      description: 'start node',
      position: { x: 0, y: 0 },
      symbol: Some('start'),
      group: None,
      parameters: None,
      inputs: None,
      outputs: makeOutput('out', z.string()),
      executor: {
        async execute(ctx) {
          if (ctx.outputs.type === 'Some') {
            const out = ctx.outputs.value.find((port) => port.id === 'out')
            if (out) {
              out.value = Some('hello-from-definition')
            }
          }
        },
      },
    })

    registerNode(registry, 'demo/end', {
      name: 'End',
      description: 'end node',
      position: { x: 240, y: 0 },
      symbol: None,
      group: None,
      parameters: None,
      inputs: makeInput('in', z.string()),
      outputs: None,
      executor: {
        async execute(ctx) {
          if (ctx.inputs.type === 'Some') {
            const input = ctx.inputs.value.find((p) => p.id === 'in')
            if (input?.value.type === 'Some') {
              received.push(String(input.value.value))
            }
          }
        },
      },
    })

    const flow = createFlow(
      {
        name: 'flow-no-port-data',
        nodes: [
          { id: 'start', key: 'demo/start', name: 'Start', description: 'start', position: { x: 0, y: 0 } },
          { id: 'end', key: 'demo/end', name: 'End', description: 'end', position: { x: 240, y: 0 } },
        ],
        edges: [{ from: { nodeId: 'start', portId: 'out' }, to: { nodeId: 'end', portId: 'in' } }],
      },
      registry
    )

    const result = await runFlow(flow, 'start')
    expect(result.status).toBe('completed')
    expect(received).toEqual(['hello-from-definition'])
  })
})
