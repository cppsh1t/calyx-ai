import { compileFlow } from '@/core/flow.ts'
import { NodeRegistry } from '@/core/registry.ts'
import type { FlowConfig, NodeDefinition, Option } from '@/types'
import { describe, expect, it } from 'bun:test'
import z from 'zod'

function getSomeValue<T>(option: Option<T>): T {
  if (option.type === 'None') {
    throw new Error('Expected Some but got None')
  }
  return option.value
}

function createStartDefinition(): NodeDefinition {
  return {
    name: 'Start',
    description: 'Start node',
    docs: 'start docs',
    type: ['start-node'],
    group: 'test',
    parameters: { type: 'None' },
    inputs: { type: 'None' },
    outputs: {
      type: 'Some',
      value: [
        {
          id: 'def-start-out',
          name: 'startOut',
          description: 'start output',
          schema: z.string(),
          value: { type: 'None' },
          requiredInputs: { type: 'None' },
        },
      ],
    },
    executors: [
      {
        outputName: 'startOut',
        used: false,
        func: async () => ({ continue: true, data: 'hello' }),
      },
    ],
  }
}

function createTransformDefinition(): NodeDefinition {
  return {
    name: 'Transform',
    description: 'Transform node',
    docs: 'transform docs',
    type: ['transform-node'],
    group: 'test',
    parameters: { type: 'None' },
    inputs: {
      type: 'Some',
      value: [
        {
          id: 'def-transform-in',
          name: 'transformIn',
          description: 'transform input',
          schema: z.string(),
          value: { type: 'None' },
        },
      ],
    },
    outputs: {
      type: 'Some',
      value: [
        {
          id: 'def-transform-out',
          name: 'transformOut',
          description: 'transform output',
          schema: z.string(),
          value: { type: 'None' },
          requiredInputs: { type: 'Some', value: ['transformIn'] },
        },
      ],
    },
    executors: [
      {
        outputName: 'transformOut',
        used: false,
        func: async (ctx) => {
          if (ctx.inputs.type === 'None') {
            return { continue: false, data: null }
          }
          const inputPort = ctx.inputs.value.find((item) => item.name === 'transformIn')
          if (!inputPort || inputPort.value.type === 'None') {
            return { continue: false, data: null }
          }
          return { continue: true, data: `${inputPort.value.value}-world` }
        },
      },
    ],
  }
}

function createEndDefinition(): NodeDefinition {
  return {
    name: 'End',
    description: 'End node',
    docs: 'end docs',
    type: ['end-node'],
    group: 'test',
    parameters: { type: 'None' },
    inputs: {
      type: 'Some',
      value: [
        {
          id: 'def-end-in',
          name: 'endIn',
          description: 'end input',
          schema: z.string(),
          value: { type: 'None' },
        },
      ],
    },
    outputs: { type: 'None' },
    executors: [],
  }
}

function createRegistry(): NodeRegistry {
  const registry = new NodeRegistry()
  registry.register('test/start', createStartDefinition())
  registry.register('test/transform', createTransformDefinition())
  registry.register('test/end', createEndDefinition())
  return registry
}

function createFlowConfig(name = 'flow-under-test'): FlowConfig {
  return {
    name,
    nodes: [
      {
        id: 'node-start',
        key: 'test/start',
        name: 'Start',
        outputs: [
          {
            id: 'port-start-out',
            name: 'startOut',
            description: 'start output',
            schema: { type: 'string' },
          },
        ],
      },
      {
        id: 'node-transform',
        key: 'test/transform',
        name: 'Transform',
        inputs: [
          {
            id: 'port-transform-in',
            name: 'transformIn',
            description: 'transform input',
            schema: { type: 'string' },
          },
        ],
        outputs: [
          {
            id: 'port-transform-out',
            name: 'transformOut',
            description: 'transform output',
            schema: { type: 'string' },
            requiredInputs: ['transformIn'],
          },
        ],
      },
      {
        id: 'node-end',
        key: 'test/end',
        name: 'End',
        inputs: [
          {
            id: 'port-end-in',
            name: 'endIn',
            description: 'end input',
            schema: { type: 'string' },
          },
        ],
      },
    ],
    edges: [
      {
        sourceNodeId: 'node-start',
        targetNodeId: 'node-transform',
        sourcePortId: 'port-start-out',
        targetPortId: 'port-transform-in',
      },
      {
        sourceNodeId: 'node-transform',
        targetNodeId: 'node-end',
        sourcePortId: 'port-transform-out',
        targetPortId: 'port-end-in',
      },
    ],
  }
}

function collectPortIdsFromRaw(raw: { nodes: Array<{ inputs: Option<Array<{ id: string }>>; outputs: Option<Array<{ id: string }>> }> }): Set<string> {
  const ids = new Set<string>()
  for (const node of raw.nodes) {
    if (node.inputs.type === 'Some') {
      for (const input of node.inputs.value) ids.add(input.id)
    }
    if (node.outputs.type === 'Some') {
      for (const output of node.outputs.value) ids.add(output.id)
    }
  }
  return ids
}

describe('compileFlow', () => {
  it('should execute start->transform->end pipeline and propagate validated values', async () => {
    const flow = compileFlow(createFlowConfig(), createRegistry())

    const flowRaw = await flow.run(new AbortController())

    const endNode = flowRaw.nodes.find((node) => node.name === 'End')
    expect(endNode).toBeDefined()
    expect(endNode?.inputs.type).toBe('Some')

    if (!endNode || endNode.inputs.type !== 'Some') {
      throw new Error('Expected end node with input ports')
    }

    const endInput = endNode.inputs.value.find((port) => port.name === 'endIn')
    expect(endInput).toBeDefined()
    if (!endInput) {
      throw new Error('Expected end input port')
    }
    expect(getSomeValue(endInput.value)).toBe('hello-world')
  })

  it('should throw when flow has duplicate node ids', () => {
    const config = createFlowConfig('duplicate-node-flow')
    config.nodes[1] = { ...config.nodes[1]!, id: config.nodes[0]!.id }

    expect(() => compileFlow(config, createRegistry())).toThrow(/duplicate node id/)
  })

  it('should throw when edge source port is not an output port', () => {
    const config = createFlowConfig('invalid-edge-flow')
    config.edges[0] = {
      ...config.edges[0]!,
      sourcePortId: 'port-transform-in',
    }

    expect(() => compileFlow(config, createRegistry())).toThrow(/Edge source port/)
  })

  it('should throw at run-time when flow has no start node', async () => {
    const registry = createRegistry()
    const config = createFlowConfig('no-start-flow')
    config.nodes[0] = {
      ...config.nodes[0]!,
      key: 'test/transform',
      name: 'NotStart',
      inputs: [
        {
          id: 'rewired-start-input',
          name: 'transformIn',
          description: 'transform input',
          schema: { type: 'string' },
        },
      ],
      outputs: [
        {
          id: 'rewired-start-output',
          name: 'transformOut',
          description: 'transform output',
          schema: { type: 'string' },
          requiredInputs: ['transformIn'],
        },
      ],
    }
    config.edges[0] = {
      sourceNodeId: 'node-start',
      targetNodeId: 'node-transform',
      sourcePortId: 'rewired-start-output',
      targetPortId: 'port-transform-in',
    }

    const flow = compileFlow(config, registry)
    await expect(flow.run(new AbortController())).rejects.toThrow(/has no start node/)
  })

  it('should fork flow with regenerated node and port ids while preserving graph structure', async () => {
    const flow = compileFlow(createFlowConfig('fork-flow'), createRegistry())
    const forked = flow.fork()

    const originalRaw = await flow.run(new AbortController())
    const forkedRaw = await forked.run(new AbortController())

    const originalNodeIds = new Set(originalRaw.nodes.map((node) => node.id))
    const forkedNodeIds = new Set(forkedRaw.nodes.map((node) => node.id))

    expect(originalNodeIds.size).toBe(forkedNodeIds.size)
    for (const id of originalNodeIds) {
      expect(forkedNodeIds.has(id)).toBe(false)
    }

    const originalPortIds = collectPortIdsFromRaw(originalRaw)
    const forkedPortIds = collectPortIdsFromRaw(forkedRaw)
    expect(originalPortIds.size).toBe(forkedPortIds.size)
    for (const id of originalPortIds) {
      expect(forkedPortIds.has(id)).toBe(false)
    }

    const forkedNodeIdSet = new Set(forkedRaw.nodes.map((node) => node.id))
    for (const edge of forkedRaw.edges) {
      expect(forkedNodeIdSet.has(edge.sourceNodeId)).toBe(true)
      expect(forkedNodeIdSet.has(edge.targetNodeId)).toBe(true)

      const sourceNode = forkedRaw.nodes.find((node) => node.id === edge.sourceNodeId)
      const targetNode = forkedRaw.nodes.find((node) => node.id === edge.targetNodeId)
      expect(sourceNode).toBeDefined()
      expect(targetNode).toBeDefined()

      if (!sourceNode || !targetNode) {
        throw new Error('Expected forked edge nodes to exist')
      }

      const sourceOutputIds = sourceNode.outputs.type === 'Some' ? sourceNode.outputs.value.map((port) => port.id) : []
      const targetInputIds = targetNode.inputs.type === 'Some' ? targetNode.inputs.value.map((port) => port.id) : []
      expect(sourceOutputIds.includes(edge.sourcePortId)).toBe(true)
      expect(targetInputIds.includes(edge.targetPortId)).toBe(true)
    }
  })
})
