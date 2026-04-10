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
    createNodeDefinition({ name: 'Bad Source Node', type: ['start-node'], inputs: Some([createInputDefinition('badIn')]) })
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

  test('rejects start nodes with incoming edges', () => {
    const config: FlowConfig = {
      name: 'start-with-incoming-edge',
      nodes: [
        createNodeData('middle-1', 'demo/middle', 'Middle Node', {
          inputs: Some([{ id: 'middle-in-1', name: 'middleIn' }]),
          outputs: Some([{ id: 'middle-out-1', name: 'middleOut' }]),
        }),
        createNodeData('start-1', 'demo/start-with-input', 'Start With Input Node', {
          inputs: Some([{ id: 'start-in-1', name: 'startIn' }]),
          outputs: Some([{ id: 'start-out-1', name: 'startOut' }]),
        }),
      ],
      edges: [{ sourceNodeId: 'middle-1', sourcePortId: 'middle-out-1', targetNodeId: 'start-1', targetPortId: 'start-in-1' }],
    }

    expect(() => buildFlow(config, createRegistry())).toThrow(/Start node "start-1" cannot have incoming edges/)
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
