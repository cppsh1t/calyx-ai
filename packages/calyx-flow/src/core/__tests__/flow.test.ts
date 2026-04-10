import { buildFlow } from '@/core/flow.ts'
import { NodeRegistry } from '@/core/registry.ts'
import type { FlowConfig, NodeData, NodeDefinition, NodeExecutor, NodeInputPortDefinition, NodeOutputPortDefinition } from '@/types'
import { None, Some } from '@/utils/structure.ts'
import { describe, expect, test } from 'bun:test'
import z from 'zod'

const noopExecutor: NodeExecutor = async () => ({ continue: true, data: 'done' })

function createInputDefinition(name: string, schema: z.ZodType = z.string(), overrides: Partial<NodeInputPortDefinition> = {}): NodeInputPortDefinition {
  return {
    name,
    description: `Input ${name}`,
    schema,
    postCompile: None,
    ...overrides,
  }
}

function createOutputDefinition(name: string, schema: z.ZodType = z.string(), overrides: Partial<NodeOutputPortDefinition> = {}): NodeOutputPortDefinition {
  return {
    name,
    description: `Output ${name}`,
    schema,
    requiredInputs: None,
    executor: noopExecutor,
    postCompile: None,
    ...overrides,
  }
}

function createNodeDefinition(overrides: Partial<NodeDefinition> = {}): NodeDefinition {
  return {
    name: 'Node',
    description: 'Node description',
    type: ['test-node'],
    docs: 'docs',
    group: 'group',
    parameters: None,
    inputs: None,
    outputs: None,
    ...overrides,
  }
}

function createNodeData(id: string, key: NodeData['key'], name: string, overrides: Partial<NodeData> = {}): NodeData {
  return {
    id,
    key,
    name,
    position: { x: 0, y: 0 },
    parameters: None,
    inputs: None,
    outputs: None,
    ...overrides,
  }
}

function createRegistry(): NodeRegistry {
  const registry = new NodeRegistry()
  registry.register('demo/start', createNodeDefinition({ name: 'Start Node', type: ['start-node'], outputs: Some([createOutputDefinition('startOut')]) }))
  registry.register(
    'demo/middle',
    createNodeDefinition({ name: 'Middle Node', inputs: Some([createInputDefinition('middleIn')]), outputs: Some([createOutputDefinition('middleOut')]) })
  )
  registry.register('demo/end', createNodeDefinition({ name: 'End Node', inputs: Some([createInputDefinition('endIn')]) }))
  registry.register('demo/number-end', createNodeDefinition({ name: 'Number End Node', inputs: Some([createInputDefinition('endIn', z.number())]) }))
  registry.register(
    'demo/start-with-input',
    createNodeDefinition({
      name: 'Start With Input Node',
      type: ['start-node'],
      inputs: Some([createInputDefinition('startIn')]),
      outputs: Some([createOutputDefinition('startOut')]),
    })
  )
  registry.register(
    'demo/input-only-start-port',
    createNodeDefinition({ name: 'Bad Source Node', type: ['test-node'], inputs: Some([createInputDefinition('badIn')]) })
  )
  registry.register(
    'demo/start-with-required-inputs',
    createNodeDefinition({
      name: 'Start With Required Inputs Node',
      type: ['start-node'],
      inputs: Some([createInputDefinition('startIn')]),
      outputs: Some([createOutputDefinition('startOut', z.string(), { requiredInputs: Some(['startIn']) })]),
    })
  )
  registry.register('demo/output-only-target-port', createNodeDefinition({ name: 'Bad Target Node', outputs: Some([createOutputDefinition('badOut')]) }))
  registry.register(
    'demo/cycle',
    createNodeDefinition({ name: 'Cycle Node', inputs: Some([createInputDefinition('cycleIn')]), outputs: Some([createOutputDefinition('cycleOut')]) })
  )
  registry.register('demo/no-output-start', createNodeDefinition({ name: 'Empty Start Node', type: ['start-node'], outputs: None }))
  return registry
}

function createValidFlowConfig(): FlowConfig {
  return {
    name: 'valid-flow',
    nodes: [
      createNodeData('start-1', 'demo/start', 'Start Node', { outputs: Some([{ id: 'start-out-1', name: 'startOut' }]) }),
      createNodeData('middle-1', 'demo/middle', 'Middle Node', {
        inputs: Some([{ id: 'middle-in-1', name: 'middleIn' }]),
        outputs: Some([{ id: 'middle-out-1', name: 'middleOut' }]),
      }),
      createNodeData('end-1', 'demo/end', 'End Node', { inputs: Some([{ id: 'end-in-1', name: 'endIn' }]) }),
    ],
    edges: [
      { sourceNodeId: 'start-1', sourcePortId: 'start-out-1', targetNodeId: 'middle-1', targetPortId: 'middle-in-1' },
      { sourceNodeId: 'middle-1', sourcePortId: 'middle-out-1', targetNodeId: 'end-1', targetPortId: 'end-in-1' },
    ],
  }
}

function createDeferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve = () => {}
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

describe('buildFlow flow-level validation', () => {
  test('accepts a valid DAG flow', () => {
    const flow = buildFlow(createValidFlowConfig(), createRegistry())

    expect(flow.getName()).toBe('valid-flow')
    expect(flow.getRunningStatus()).toBe(false)
  })

  test('rejects duplicate node ids', () => {
    const config = createValidFlowConfig()
    config.nodes[1] = createNodeData('start-1', 'demo/middle', 'Middle Node', {
      inputs: Some([{ id: 'middle-in-1', name: 'middleIn' }]),
      outputs: Some([{ id: 'middle-out-1', name: 'middleOut' }]),
    })

    expect(() => buildFlow(config, createRegistry())).toThrow(/Duplicate node ids found in flow: "start-1"/)
  })

  test('rejects edges that reference missing nodes', () => {
    const config = createValidFlowConfig()
    config.edges = [{ sourceNodeId: 'start-1', sourcePortId: 'start-out-1', targetNodeId: 'missing-node', targetPortId: 'middle-in-1' }]

    expect(() => buildFlow(config, createRegistry())).toThrow(/Edge references missing target node "missing-node"/)
  })

  test('rejects source ports that are actually inputs', () => {
    const config: FlowConfig = {
      name: 'bad-source-port',
      nodes: [
        createNodeData('source-1', 'demo/input-only-start-port', 'Bad Source Node', { inputs: Some([{ id: 'bad-input-id', name: 'badIn' }]) }),
        createNodeData('end-1', 'demo/end', 'End Node', { inputs: Some([{ id: 'end-in-1', name: 'endIn' }]) }),
      ],
      edges: [{ sourceNodeId: 'source-1', sourcePortId: 'bad-input-id', targetNodeId: 'end-1', targetPortId: 'end-in-1' }],
    }

    expect(() => buildFlow(config, createRegistry())).toThrow(/source ports must be outputs/)
  })

  test('rejects target ports that are actually outputs', () => {
    const config: FlowConfig = {
      name: 'bad-target-port',
      nodes: [
        createNodeData('start-1', 'demo/start', 'Start Node', { outputs: Some([{ id: 'start-out-1', name: 'startOut' }]) }),
        createNodeData('target-1', 'demo/output-only-target-port', 'Bad Target Node', { outputs: Some([{ id: 'bad-output-id', name: 'badOut' }]) }),
      ],
      edges: [{ sourceNodeId: 'start-1', sourcePortId: 'start-out-1', targetNodeId: 'target-1', targetPortId: 'bad-output-id' }],
    }

    expect(() => buildFlow(config, createRegistry())).toThrow(/target ports must be inputs/)
  })

  test('rejects multiple edges feeding the same input port', () => {
    const config = createValidFlowConfig()
    config.nodes.unshift(createNodeData('start-2', 'demo/start', 'Start Node', { outputs: Some([{ id: 'start-out-2', name: 'startOut' }]) }))
    config.edges.unshift({ sourceNodeId: 'start-2', sourcePortId: 'start-out-2', targetNodeId: 'middle-1', targetPortId: 'middle-in-1' })

    expect(() => buildFlow(config, createRegistry())).toThrow(/is connected by multiple edges, but inputs are consume-once/)
  })

  test('rejects missing start nodes', () => {
    const config: FlowConfig = {
      name: 'no-start',
      nodes: [createNodeData('end-1', 'demo/end', 'End Node', { inputs: Some([{ id: 'end-in-1', name: 'endIn' }]) })],
      edges: [],
    }

    expect(() => buildFlow(config, createRegistry())).toThrow(/Flow must contain at least one start node/)
  })

  test('rejects start nodes with inputs', () => {
    const config: FlowConfig = {
      name: 'start-with-inputs',
      nodes: [
        createNodeData('start-1', 'demo/start-with-input', 'Start With Input Node', {
          inputs: Some([{ id: 'start-in-1', name: 'startIn' }]),
          outputs: Some([{ id: 'start-out-1', name: 'startOut' }]),
        }),
      ],
      edges: [],
    }

    expect(() => buildFlow(config, createRegistry())).toThrow(/Start node "Start With Input Node" \(id: start-1\) cannot declare input ports/)
  })

  test('rejects start node outputs with requiredInputs', () => {
    const config: FlowConfig = {
      name: 'start-output-with-required-inputs',
      nodes: [
        createNodeData('start-1', 'demo/start-with-required-inputs', 'Start With Required Inputs Node', {
          inputs: Some([{ id: 'start-in-1', name: 'startIn' }]),
          outputs: Some([{ id: 'start-out-1', name: 'startOut' }]),
        }),
      ],
      edges: [],
    }

    expect(() => buildFlow(config, createRegistry())).toThrow(/Start node output port "startOut" \(id: start-out-1\) cannot declare requiredInputs/)
  })

  test('rejects start nodes without outputs', () => {
    const config: FlowConfig = {
      name: 'empty-start',
      nodes: [createNodeData('start-1', 'demo/no-output-start', 'Empty Start Node', { outputs: None })],
      edges: [],
    }

    expect(() => buildFlow(config, createRegistry())).toThrow(/must declare at least one output port/)
  })

  test('rejects self-loops', () => {
    const config: FlowConfig = {
      name: 'self-loop',
      nodes: [
        createNodeData('start-1', 'demo/start', 'Start Node', { outputs: Some([{ id: 'start-out-1', name: 'startOut' }]) }),
        createNodeData('cycle-1', 'demo/cycle', 'Cycle Node', {
          inputs: Some([{ id: 'cycle-in-1', name: 'cycleIn' }]),
          outputs: Some([{ id: 'cycle-out-1', name: 'cycleOut' }]),
        }),
      ],
      edges: [{ sourceNodeId: 'cycle-1', sourcePortId: 'cycle-out-1', targetNodeId: 'cycle-1', targetPortId: 'cycle-in-1' }],
    }

    expect(() => buildFlow(config, createRegistry())).toThrow(/Self-loop detected on node/)
  })

  test('rejects cycles', () => {
    const config: FlowConfig = {
      name: 'cycle',
      nodes: [
        createNodeData('start-1', 'demo/start', 'Start Node', { outputs: Some([{ id: 'start-out-1', name: 'startOut' }]) }),
        createNodeData('cycle-1', 'demo/cycle', 'Cycle Node', {
          inputs: Some([{ id: 'cycle-in-1', name: 'cycleIn' }]),
          outputs: Some([{ id: 'cycle-out-1', name: 'cycleOut' }]),
        }),
        createNodeData('cycle-2', 'demo/cycle', 'Cycle Node', {
          inputs: Some([{ id: 'cycle-in-2', name: 'cycleIn' }]),
          outputs: Some([{ id: 'cycle-out-2', name: 'cycleOut' }]),
        }),
      ],
      edges: [
        { sourceNodeId: 'cycle-1', sourcePortId: 'cycle-out-1', targetNodeId: 'cycle-2', targetPortId: 'cycle-in-2' },
        { sourceNodeId: 'cycle-2', sourcePortId: 'cycle-out-2', targetNodeId: 'cycle-1', targetPortId: 'cycle-in-1' },
      ],
    }

    expect(() => buildFlow(config, createRegistry())).toThrow(/Cycle detected in flow graph/)
  })

  test('rejects incompatible schemas across edges', () => {
    const config: FlowConfig = {
      name: 'schema-mismatch',
      nodes: [
        createNodeData('start-1', 'demo/start', 'Start Node', { outputs: Some([{ id: 'start-out-1', name: 'startOut' }]) }),
        createNodeData('end-1', 'demo/number-end', 'Number End Node', { inputs: Some([{ id: 'end-in-1', name: 'endIn' }]) }),
      ],
      edges: [{ sourceNodeId: 'start-1', sourcePortId: 'start-out-1', targetNodeId: 'end-1', targetPortId: 'end-in-1' }],
    }

    expect(() => buildFlow(config, createRegistry())).toThrow(/Schema incompatibility between output port/)
  })
})

describe('buildFlow runtime execution', () => {
  test('executes a linear flow and returns fresh runtime state for each run', async () => {
    const registry = new NodeRegistry()

    registry.register(
      'runtime/start',
      createNodeDefinition({
        name: 'Runtime Start',
        type: ['start-node'],
        outputs: Some([
          createOutputDefinition('startOut', z.string(), {
            executor: async () => ({ continue: true, data: 'start-value' }),
          }),
        ]),
      })
    )

    registry.register(
      'runtime/middle',
      createNodeDefinition({
        name: 'Runtime Middle',
        inputs: Some([createInputDefinition('middleIn')]),
        outputs: Some([
          createOutputDefinition('middleOut', z.string(), {
            executor: async (ctx) => {
              const value = ctx.inputs.type === 'Some' ? ctx.inputs.value[0]?.value : None
              return {
                continue: true,
                data: value.type === 'Some' ? `${value.value}-middle` : 'missing',
              }
            },
          }),
        ]),
      })
    )

    registry.register('runtime/end', createNodeDefinition({ name: 'Runtime End', inputs: Some([createInputDefinition('endIn')]) }))

    const config: FlowConfig = {
      name: 'runtime-linear',
      nodes: [
        createNodeData('start-1', 'runtime/start', 'Runtime Start', { outputs: Some([{ id: 'start-out-1', name: 'startOut' }]) }),
        createNodeData('middle-1', 'runtime/middle', 'Runtime Middle', {
          inputs: Some([{ id: 'middle-in-1', name: 'middleIn' }]),
          outputs: Some([{ id: 'middle-out-1', name: 'middleOut' }]),
        }),
        createNodeData('end-1', 'runtime/end', 'Runtime End', { inputs: Some([{ id: 'end-in-1', name: 'endIn' }]) }),
      ],
      edges: [
        { sourceNodeId: 'start-1', sourcePortId: 'start-out-1', targetNodeId: 'middle-1', targetPortId: 'middle-in-1' },
        { sourceNodeId: 'middle-1', sourcePortId: 'middle-out-1', targetNodeId: 'end-1', targetPortId: 'end-in-1' },
      ],
    }

    const flow = buildFlow(config, registry)

    const firstRun = await flow.run()
    const secondRun = await flow.run()

    expect(firstRun.id).not.toBe(secondRun.id)
    expect(firstRun.name).toBe('runtime-linear')

    const firstStart = firstRun.nodes.find((node) => node.id === 'start-1')
    const firstMiddle = firstRun.nodes.find((node) => node.id === 'middle-1')
    const firstEnd = firstRun.nodes.find((node) => node.id === 'end-1')

    expect(firstStart?.outputs.type).toBe('Some')
    expect(firstStart?.outputs.type === 'Some' ? firstStart.outputs.value[0]?.value : None).toEqual(Some('start-value'))
    expect(firstStart?.outputs.type === 'Some' ? firstStart.outputs.value[0]?.used : false).toBe(true)

    expect(firstMiddle?.inputs.type).toBe('Some')
    expect(firstMiddle?.inputs.type === 'Some' ? firstMiddle.inputs.value[0]?.value : None).toEqual(Some('start-value'))
    expect(firstMiddle?.outputs.type).toBe('Some')
    expect(firstMiddle?.outputs.type === 'Some' ? firstMiddle.outputs.value[0]?.value : None).toEqual(Some('start-value-middle'))
    expect(firstMiddle?.runningTimes).toBe(0)

    expect(firstEnd?.inputs.type).toBe('Some')
    expect(firstEnd?.inputs.type === 'Some' ? firstEnd.inputs.value[0]?.value : None).toEqual(Some('start-value-middle'))
    expect(firstEnd?.runningTimes).toBe(0)

    const secondStart = secondRun.nodes.find((node) => node.id === 'start-1')
    expect(secondStart?.outputs.type === 'Some' ? secondStart.outputs.value[0]?.value : None).toEqual(Some('start-value'))
  })

  test('passes runtime context into executors', async () => {
    const registry = new NodeRegistry()
    let capturedContext: NodeExecuteContext | null = null

    registry.register(
      'runtime/context-start',
      createNodeDefinition({
        name: 'Context Start',
        type: ['start-node'],
        parameters: Some([{ name: 'message', description: 'Message', schema: z.string() }]),
        outputs: Some([
          createOutputDefinition('startOut', z.string(), {
            executor: async (ctx) => {
              capturedContext = ctx
              return { continue: true, data: 'context-value' }
            },
          }),
        ]),
      })
    )

    const config: FlowConfig = {
      name: 'runtime-context',
      nodes: [
        createNodeData('start-1', 'runtime/context-start', 'Context Start', {
          parameters: Some([{ name: 'message', value: Some('hello') }]),
          outputs: Some([{ id: 'start-out-1', name: 'startOut' }]),
        }),
      ],
      edges: [],
    }

    const flow = buildFlow(config, registry)
    await flow.run()

    expect(capturedContext?.currentNode.id).toBe('start-1')
    expect(capturedContext?.currentNode.name).toBe('Context Start')
    expect(capturedContext?.signal.aborted).toBe(false)
    expect(capturedContext?.inputs.type).toBe('None')
    expect(capturedContext?.parameters.type).toBe('Some')
    expect(capturedContext?.parameters.type === 'Some' ? capturedContext.parameters.value[0]?.value : None).toEqual(Some('hello'))
  })

  test('stops propagation when executor returns continue false', async () => {
    const registry = new NodeRegistry()

    registry.register(
      'runtime/start',
      createNodeDefinition({
        name: 'Runtime Start',
        type: ['start-node'],
        outputs: Some([
          createOutputDefinition('startOut', z.string(), {
            executor: async () => ({ continue: true, data: 'start-value' }),
          }),
        ]),
      })
    )

    registry.register(
      'runtime/stopper',
      createNodeDefinition({
        name: 'Runtime Stopper',
        inputs: Some([createInputDefinition('middleIn')]),
        outputs: Some([
          createOutputDefinition('middleOut', z.string(), {
            executor: async () => ({ continue: false, data: 'blocked' }),
          }),
        ]),
      })
    )

    registry.register('runtime/end', createNodeDefinition({ name: 'Runtime End', inputs: Some([createInputDefinition('endIn')]) }))

    const config: FlowConfig = {
      name: 'runtime-stop',
      nodes: [
        createNodeData('start-1', 'runtime/start', 'Runtime Start', { outputs: Some([{ id: 'start-out-1', name: 'startOut' }]) }),
        createNodeData('middle-1', 'runtime/stopper', 'Runtime Stopper', {
          inputs: Some([{ id: 'middle-in-1', name: 'middleIn' }]),
          outputs: Some([{ id: 'middle-out-1', name: 'middleOut' }]),
        }),
        createNodeData('end-1', 'runtime/end', 'Runtime End', { inputs: Some([{ id: 'end-in-1', name: 'endIn' }]) }),
      ],
      edges: [
        { sourceNodeId: 'start-1', sourcePortId: 'start-out-1', targetNodeId: 'middle-1', targetPortId: 'middle-in-1' },
        { sourceNodeId: 'middle-1', sourcePortId: 'middle-out-1', targetNodeId: 'end-1', targetPortId: 'end-in-1' },
      ],
    }

    const flow = buildFlow(config, registry)
    const instance = await flow.run()

    const middle = instance.nodes.find((node) => node.id === 'middle-1')
    const end = instance.nodes.find((node) => node.id === 'end-1')

    expect(middle?.outputs.type).toBe('Some')
    expect(middle?.outputs.type === 'Some' ? middle.outputs.value[0]?.used : false).toBe(true)
    expect(middle?.outputs.type === 'Some' ? middle.outputs.value[0]?.value : None).toEqual(None)
    expect(end?.inputs.type === 'Some' ? end.inputs.value[0]?.value : None).toEqual(None)
    expect(end?.inputs.type === 'Some' ? end.inputs.value[0]?.used : false).toBe(false)
  })

  test('does not execute when aborted before run starts', async () => {
    const registry = new NodeRegistry()
    let executionCount = 0

    registry.register(
      'runtime/start',
      createNodeDefinition({
        name: 'Runtime Start',
        type: ['start-node'],
        outputs: Some([
          createOutputDefinition('startOut', z.string(), {
            executor: async () => {
              executionCount += 1
              return { continue: true, data: 'should-not-run' }
            },
          }),
        ]),
      })
    )

    const config: FlowConfig = {
      name: 'runtime-abort-before-start',
      nodes: [createNodeData('start-1', 'runtime/start', 'Runtime Start', { outputs: Some([{ id: 'start-out-1', name: 'startOut' }]) })],
      edges: [],
    }

    const flow = buildFlow(config, registry)
    const abort = new AbortController()
    abort.abort()

    const instance = await flow.run(abort)
    const start = instance.nodes.find((node) => node.id === 'start-1')

    expect(executionCount).toBe(0)
    expect(start?.outputs.type === 'Some' ? start.outputs.value[0]?.used : false).toBe(false)
    expect(flow.getRunningStatus()).toBe(false)
  })

  test('rejects concurrent runs and resets running status after completion', async () => {
    const registry = new NodeRegistry()
    const deferred = createDeferred()

    registry.register(
      'runtime/slow-start',
      createNodeDefinition({
        name: 'Slow Start',
        type: ['start-node'],
        outputs: Some([
          createOutputDefinition('startOut', z.string(), {
            executor: async () => {
              await deferred.promise
              return { continue: true, data: 'slow-value' }
            },
          }),
        ]),
      })
    )

    const config: FlowConfig = {
      name: 'runtime-reentry',
      nodes: [createNodeData('start-1', 'runtime/slow-start', 'Slow Start', { outputs: Some([{ id: 'start-out-1', name: 'startOut' }]) })],
      edges: [],
    }

    const flow = buildFlow(config, registry)
    const firstRun = flow.run()

    expect(flow.getRunningStatus()).toBe(true)
    await expect(flow.run()).rejects.toThrow(/Flow is already running/)

    deferred.resolve()
    await firstRun

    expect(flow.getRunningStatus()).toBe(false)
  })

  test('rethrows executor errors and resets running status', async () => {
    const registry = new NodeRegistry()

    registry.register(
      'runtime/failing-start',
      createNodeDefinition({
        name: 'Failing Start',
        type: ['start-node'],
        outputs: Some([
          createOutputDefinition('startOut', z.string(), {
            executor: async () => {
              throw new Error('boom')
            },
          }),
        ]),
      })
    )

    const config: FlowConfig = {
      name: 'runtime-error',
      nodes: [createNodeData('start-1', 'runtime/failing-start', 'Failing Start', { outputs: Some([{ id: 'start-out-1', name: 'startOut' }]) })],
      edges: [],
    }

    const flow = buildFlow(config, registry)

    await expect(flow.run()).rejects.toThrow(/boom/)
    expect(flow.getRunningStatus()).toBe(false)
  })

  test('fans out one output to multiple downstream nodes', async () => {
    const registry = new NodeRegistry()

    registry.register(
      'runtime/start',
      createNodeDefinition({
        name: 'Runtime Start',
        type: ['start-node'],
        outputs: Some([
          createOutputDefinition('startOut', z.string(), {
            executor: async () => ({ continue: true, data: 'fanout-value' }),
          }),
        ]),
      })
    )

    registry.register('runtime/end-a', createNodeDefinition({ name: 'End A', inputs: Some([createInputDefinition('endIn')]) }))
    registry.register('runtime/end-b', createNodeDefinition({ name: 'End B', inputs: Some([createInputDefinition('endIn')]) }))

    const config: FlowConfig = {
      name: 'runtime-fanout',
      nodes: [
        createNodeData('start-1', 'runtime/start', 'Runtime Start', { outputs: Some([{ id: 'start-out-1', name: 'startOut' }]) }),
        createNodeData('end-a', 'runtime/end-a', 'End A', { inputs: Some([{ id: 'end-in-a', name: 'endIn' }]) }),
        createNodeData('end-b', 'runtime/end-b', 'End B', { inputs: Some([{ id: 'end-in-b', name: 'endIn' }]) }),
      ],
      edges: [
        { sourceNodeId: 'start-1', sourcePortId: 'start-out-1', targetNodeId: 'end-a', targetPortId: 'end-in-a' },
        { sourceNodeId: 'start-1', sourcePortId: 'start-out-1', targetNodeId: 'end-b', targetPortId: 'end-in-b' },
      ],
    }

    const flow = buildFlow(config, registry)
    const instance = await flow.run()

    const endA = instance.nodes.find((node) => node.id === 'end-a')
    const endB = instance.nodes.find((node) => node.id === 'end-b')

    expect(endA?.inputs.type === 'Some' ? endA.inputs.value[0]?.value : None).toEqual(Some('fanout-value'))
    expect(endB?.inputs.type === 'Some' ? endB.inputs.value[0]?.value : None).toEqual(Some('fanout-value'))
  })

  test('waits for all requiredInputs before executing a join node', async () => {
    const registry = new NodeRegistry()

    registry.register(
      'runtime/start-left',
      createNodeDefinition({
        name: 'Start Left',
        type: ['start-node'],
        outputs: Some([
          createOutputDefinition('leftOut', z.string(), {
            executor: async () => ({ continue: true, data: 'left' }),
          }),
        ]),
      })
    )

    registry.register(
      'runtime/start-right',
      createNodeDefinition({
        name: 'Start Right',
        type: ['start-node'],
        outputs: Some([
          createOutputDefinition('rightOut', z.string(), {
            executor: async () => ({ continue: true, data: 'right' }),
          }),
        ]),
      })
    )

    registry.register(
      'runtime/join',
      createNodeDefinition({
        name: 'Join Node',
        inputs: Some([createInputDefinition('leftIn'), createInputDefinition('rightIn')]),
        outputs: Some([
          createOutputDefinition('joinedOut', z.string(), {
            requiredInputs: Some(['leftIn', 'rightIn']),
            executor: async (ctx) => {
              const left = ctx.inputs.type === 'Some' ? ctx.inputs.value[0]?.value : None
              const right = ctx.inputs.type === 'Some' ? ctx.inputs.value[1]?.value : None
              return {
                continue: true,
                data: left.type === 'Some' && right.type === 'Some' ? `${left.value}+${right.value}` : 'missing',
              }
            },
          }),
        ]),
      })
    )

    registry.register('runtime/end', createNodeDefinition({ name: 'Runtime End', inputs: Some([createInputDefinition('endIn')]) }))

    const config: FlowConfig = {
      name: 'runtime-join',
      nodes: [
        createNodeData('start-left', 'runtime/start-left', 'Start Left', { outputs: Some([{ id: 'left-out-1', name: 'leftOut' }]) }),
        createNodeData('start-right', 'runtime/start-right', 'Start Right', { outputs: Some([{ id: 'right-out-1', name: 'rightOut' }]) }),
        createNodeData('join-1', 'runtime/join', 'Join Node', {
          inputs: Some([
            { id: 'join-left-in-1', name: 'leftIn' },
            { id: 'join-right-in-1', name: 'rightIn' },
          ]),
          outputs: Some([{ id: 'join-out-1', name: 'joinedOut' }]),
        }),
        createNodeData('end-1', 'runtime/end', 'Runtime End', { inputs: Some([{ id: 'end-in-1', name: 'endIn' }]) }),
      ],
      edges: [
        { sourceNodeId: 'start-left', sourcePortId: 'left-out-1', targetNodeId: 'join-1', targetPortId: 'join-left-in-1' },
        { sourceNodeId: 'start-right', sourcePortId: 'right-out-1', targetNodeId: 'join-1', targetPortId: 'join-right-in-1' },
        { sourceNodeId: 'join-1', sourcePortId: 'join-out-1', targetNodeId: 'end-1', targetPortId: 'end-in-1' },
      ],
    }

    const flow = buildFlow(config, registry)
    const instance = await flow.run()

    const join = instance.nodes.find((node) => node.id === 'join-1')
    const end = instance.nodes.find((node) => node.id === 'end-1')

    expect(join?.inputs.type).toBe('Some')
    expect(join?.inputs.type === 'Some' ? join.inputs.value[0]?.value : None).toEqual(Some('left'))
    expect(join?.inputs.type === 'Some' ? join.inputs.value[1]?.value : None).toEqual(Some('right'))
    expect(join?.outputs.type === 'Some' ? join.outputs.value[0]?.value : None).toEqual(Some('left+right'))
    expect(end?.inputs.type === 'Some' ? end.inputs.value[0]?.value : None).toEqual(Some('left+right'))
  })
})
