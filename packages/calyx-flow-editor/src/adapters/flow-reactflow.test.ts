import type { Edge as XYFlowEdge, Node as XYFlowNode } from '@xyflow/react'
import { describe, expect, it } from 'bun:test'
import type { Edge, Flow, Node, NodePort } from 'calyx-flow/types'
import {
  domainEdgeToXYFlowEdge,
  domainNodeToXYFlowNode,
  extractDomainEdges,
  extractDomainNodes,
  flowToReactFlow,
  formatHandleId,
  parseHandleId,
  reactFlowToFlow,
  xyFlowEdgeToDomainEdge,
} from './flow-reactflow'

/**
 * Test fixtures
 */

const createMockNode = (overrides: Partial<Node> & { id: string }): Node => ({
  id: overrides.id,
  name: overrides.name || `Node ${overrides.id}`,
  description: overrides.description || `Description for ${overrides.id}`,
  position: overrides.position || { x: 0, y: 0 },
  symbol: overrides.symbol || { type: 'None' },
  group: overrides.group || { type: 'None' },
  parameters: overrides.parameters || { type: 'None' },
  inputs: overrides.inputs || { type: 'None' },
  outputs: overrides.outputs || { type: 'None' },
  executor: overrides.executor || {
    async execute() {},
  },
})

const createMockPort = (id: string, direction: 'input' | 'output'): NodePort => ({
  id,
  name: id,
  schema: {} as import('zod').ZodType,
  direction,
  description: `${direction} port ${id}`,
  value: { type: 'None' },
})

const createMockEdge = (overrides: Partial<Edge> & { from: Edge['from']; to: Edge['to'] }): Edge => ({
  from: overrides.from,
  to: overrides.to,
})

describe('adapter handle formatters and parsers', () => {
  describe('formatHandleId', () => {
    it('formats in handle correctly', () => {
      expect(formatHandleId('in', 'data')).toBe('in:data')
      expect(formatHandleId('in', 'port-1')).toBe('in:port-1')
    })

    it('formats out handle correctly', () => {
      expect(formatHandleId('out', 'result')).toBe('out:result')
      expect(formatHandleId('out', 'port-1')).toBe('out:port-1')
    })
  })

  describe('parseHandleId', () => {
    it('parses valid in handles', () => {
      const result = parseHandleId('in:data')
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.direction).toBe('in')
        expect(result.portId).toBe('data')
      }
    })

    it('parses valid out handles', () => {
      const result = parseHandleId('out:result')
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.direction).toBe('out')
        expect(result.portId).toBe('result')
      }
    })

    it('returns error for invalid format (no colon)', () => {
      const result = parseHandleId('invalid')
      expect(result.type).toBe('error')
      if (result.type === 'error') {
        expect(result.reason).toBe('invalid_format')
      }
    })

    it('returns error for invalid format (multiple colons)', () => {
      const result = parseHandleId('in:port:name')
      expect(result.type).toBe('error')
      if (result.type === 'error') {
        expect(result.reason).toBe('invalid_format')
      }
    })

    it('returns error for unknown direction', () => {
      const result = parseHandleId('unknown:data')
      expect(result.type).toBe('error')
      if (result.type === 'error') {
        expect(result.reason).toBe('unknown_direction')
      }
    })

    it('returns error for empty string', () => {
      const result = parseHandleId('')
      expect(result.type).toBe('error')
      if (result.type === 'error') {
        expect(result.reason).toBe('invalid_format')
      }
    })

    it('handles portId with special characters', () => {
      const result = parseHandleId('in:my-port_123')
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.portId).toBe('my-port_123')
      }
    })
  })
})

describe('flowToReactFlow', () => {
  it('converts empty flow with None nodes and edges', () => {
    const flow: Flow = {
      name: 'empty-flow',
      nodes: { type: 'None' },
      edges: { type: 'None' },
    }

    const result = flowToReactFlow(flow)
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.data.nodes).toEqual([])
      expect(result.data.edges).toEqual([])
    }
  })

  it('converts flow with nodes and edges', () => {
    const node1 = createMockNode({
      id: 'node-1',
      name: 'Start Node',
      position: { x: 100, y: 200 },
      outputs: { type: 'Some', value: [createMockPort('out-1', 'output')] },
    })

    const node2 = createMockNode({
      id: 'node-2',
      name: 'End Node',
      position: { x: 300, y: 200 },
      inputs: { type: 'Some', value: [createMockPort('in-1', 'input')] },
    })

    const edge: Edge = {
      from: { nodeId: 'node-1', portId: 'out-1' },
      to: { nodeId: 'node-2', portId: 'in-1' },
    }

    const flow: Flow = {
      name: 'test-flow',
      nodes: { type: 'Some', value: [node1, node2] },
      edges: { type: 'Some', value: [edge] },
    }

    const result = flowToReactFlow(flow)
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.data.nodes).toHaveLength(2)
      expect(result.data.edges).toHaveLength(1)

      // Verify node conversion
      const xyNode1 = result.data.nodes.find((n) => n.id === 'node-1')
      expect(xyNode1).toBeDefined()
      expect(xyNode1?.position).toEqual({ x: 100, y: 200 })
      expect(xyNode1?.data.label).toBe('Start Node')

      // Verify edge conversion with handle IDs
      const xyEdge = result.data.edges[0]!
      expect(xyEdge.source).toBe('node-1')
      expect(xyEdge.target).toBe('node-2')
      expect(xyEdge.sourceHandle).toBe('out:out-1')
      expect(xyEdge.targetHandle).toBe('in:in-1')
    }
  })

  it('preserves domain node data in XYFlow nodes', () => {
    const node = createMockNode({
      id: 'node-1',
      name: 'Test Node',
      position: { x: 50, y: 75 },
    })

    const flow: Flow = {
      name: 'test-flow',
      nodes: { type: 'Some', value: [node] },
      edges: { type: 'None' },
    }

    const result = flowToReactFlow(flow)
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      const xyNode = result.data.nodes[0]!
      expect(xyNode.data._domainNode).toBeDefined()
      expect((xyNode.data._domainNode as Node).id).toBe('node-1')
    }
  })
})

describe('reactFlowToFlow', () => {
  it('converts XYFlow nodes and edges back to Flow', () => {
    const preservedNode = createMockNode({
      id: 'node-1',
      name: 'Original Node',
      position: { x: 0, y: 0 },
      symbol: { type: 'Some', value: 'test-symbol' },
    })

    const xyNode: XYFlowNode = {
      id: 'node-1',
      position: { x: 150, y: 250 },
      data: {
        label: 'Updated Label',
        _domainNode: preservedNode,
      },
      type: 'default',
    }

    const xyEdge: XYFlowEdge = {
      id: 'e-1',
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'out:out-1',
      targetHandle: 'in:in-1',
    }

    const result = reactFlowToFlow({
      nodes: [xyNode],
      edges: [xyEdge],
      name: 'converted-flow',
    })

    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.data.name).toBe('converted-flow')
      expect(result.data.nodes.type).toBe('Some')
      expect(result.data.edges.type).toBe('Some')

      if (result.data.nodes.type === 'Some' && result.data.nodes.value) {
        expect(result.data.nodes.value).toHaveLength(1)
        const domainNode = result.data.nodes.value[0]!
        // Position should be updated from XYFlow state
        expect(domainNode.position).toEqual({ x: 150, y: 250 })
        // Symbol should be preserved from original node
        expect(domainNode.symbol).toEqual({ type: 'Some', value: 'test-symbol' })
      }

      if (result.data.edges.type === 'Some' && result.data.edges.value) {
        expect(result.data.edges.value).toHaveLength(1)
        const domainEdge = result.data.edges.value[0]!
        expect(domainEdge.from).toEqual({ nodeId: 'node-1', portId: 'out-1' })
        expect(domainEdge.to).toEqual({ nodeId: 'node-2', portId: 'in-1' })
      }
    }
  })
})

describe('adapter round-trip', () => {
  it('preserves node ids through round-trip conversion', () => {
    const originalNodes: Node[] = [
      createMockNode({ id: 'start', position: { x: 0, y: 0 } }),
      createMockNode({ id: 'process', position: { x: 100, y: 100 } }),
      createMockNode({ id: 'end', position: { x: 200, y: 0 } }),
    ]

    const flow: Flow = {
      name: 'round-trip-test',
      nodes: { type: 'Some', value: originalNodes },
      edges: { type: 'None' },
    }

    const forwardResult = flowToReactFlow(flow)
    expect(forwardResult.type).toBe('success')

    if (forwardResult.type === 'success') {
      const backwardResult = reactFlowToFlow({
        nodes: forwardResult.data.nodes,
        edges: forwardResult.data.edges,
        name: flow.name,
      })

      expect(backwardResult.type).toBe('success')
      if (backwardResult.type === 'success') {
        if (backwardResult.data.nodes.type === 'Some' && backwardResult.data.nodes.value) {
          const ids = backwardResult.data.nodes.value.map((n) => n.id)
          expect(ids).toEqual(['start', 'process', 'end'])
        }
      }
    }
  })

  it('preserves node positions through round-trip conversion', () => {
    const originalNodes: Node[] = [createMockNode({ id: 'node-1', position: { x: 42, y: 84 } }), createMockNode({ id: 'node-2', position: { x: 150, y: 300 } })]

    const flow: Flow = {
      name: 'position-test',
      nodes: { type: 'Some', value: originalNodes },
      edges: { type: 'None' },
    }

    const forwardResult = flowToReactFlow(flow)
    expect(forwardResult.type).toBe('success')

    if (forwardResult.type === 'success') {
      // Modify positions (simulating user dragging)
      const modifiedNodes = forwardResult.data.nodes.map((n) => ({
        ...n,
        position: { x: n.position.x + 10, y: n.position.y + 20 },
      }))

      const backwardResult = reactFlowToFlow({
        nodes: modifiedNodes,
        edges: forwardResult.data.edges,
        name: flow.name,
      })

      expect(backwardResult.type).toBe('success')
      if (backwardResult.type === 'success') {
        if (backwardResult.data.nodes.type === 'Some' && backwardResult.data.nodes.value) {
          const node1 = backwardResult.data.nodes.value.find((n) => n.id === 'node-1')
          expect(node1?.position).toEqual({ x: 52, y: 104 })
        }
      }
    }
  })

  it('preserves edge from.nodeId/from.portId through round-trip', () => {
    const node1 = createMockNode({
      id: 'source-node',
      position: { x: 0, y: 0 },
      outputs: { type: 'Some', value: [createMockPort('output-1', 'output')] },
    })

    const node2 = createMockNode({
      id: 'target-node',
      position: { x: 100, y: 0 },
      inputs: { type: 'Some', value: [createMockPort('input-1', 'input')] },
    })

    const edge: Edge = {
      from: { nodeId: 'source-node', portId: 'output-1' },
      to: { nodeId: 'target-node', portId: 'input-1' },
    }

    const flow: Flow = {
      name: 'edge-test',
      nodes: { type: 'Some', value: [node1, node2] },
      edges: { type: 'Some', value: [edge] },
    }

    const forwardResult = flowToReactFlow(flow)
    expect(forwardResult.type).toBe('success')

    if (forwardResult.type === 'success') {
      const backwardResult = reactFlowToFlow({
        nodes: forwardResult.data.nodes,
        edges: forwardResult.data.edges,
        name: flow.name,
      })

      expect(backwardResult.type).toBe('success')
      if (backwardResult.type === 'success') {
        if (backwardResult.data.edges.type === 'Some' && backwardResult.data.edges.value) {
          const convertedEdge = backwardResult.data.edges.value[0]!
          expect(convertedEdge.from.nodeId).toBe('source-node')
          expect(convertedEdge.from.portId).toBe('output-1')
        }
      }
    }
  })

  it('preserves edge to.nodeId/to.portId through round-trip', () => {
    const node1 = createMockNode({
      id: 'source-node',
      position: { x: 0, y: 0 },
      outputs: { type: 'Some', value: [createMockPort('output-1', 'output')] },
    })

    const node2 = createMockNode({
      id: 'target-node',
      position: { x: 100, y: 0 },
      inputs: { type: 'Some', value: [createMockPort('input-1', 'input')] },
    })

    const edge: Edge = {
      from: { nodeId: 'source-node', portId: 'output-1' },
      to: { nodeId: 'target-node', portId: 'input-1' },
    }

    const flow: Flow = {
      name: 'edge-test',
      nodes: { type: 'Some', value: [node1, node2] },
      edges: { type: 'Some', value: [edge] },
    }

    const forwardResult = flowToReactFlow(flow)
    expect(forwardResult.type).toBe('success')

    if (forwardResult.type === 'success') {
      const backwardResult = reactFlowToFlow({
        nodes: forwardResult.data.nodes,
        edges: forwardResult.data.edges,
        name: flow.name,
      })

      expect(backwardResult.type).toBe('success')
      if (backwardResult.type === 'success') {
        if (backwardResult.data.edges.type === 'Some' && backwardResult.data.edges.value) {
          const convertedEdge = backwardResult.data.edges.value[0]!
          expect(convertedEdge.to.nodeId).toBe('target-node')
          expect(convertedEdge.to.portId).toBe('input-1')
        }
      }
    }
  })
})

describe('adapter invalid handle rejection', () => {
  it('rejects edges with missing sourceHandle', () => {
    const xyEdge: XYFlowEdge = {
      id: 'bad-edge',
      source: 'node-1',
      target: 'node-2',
      sourceHandle: undefined,
      targetHandle: 'in:port-1',
    }

    const result = xyFlowEdgeToDomainEdge(xyEdge)
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.message).toContain('Invalid source handle')
    }
  })

  it('rejects edges with missing targetHandle', () => {
    const xyEdge: XYFlowEdge = {
      id: 'bad-edge',
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'out:port-1',
      targetHandle: undefined,
    }

    const result = xyFlowEdgeToDomainEdge(xyEdge)
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.message).toContain('Invalid target handle')
    }
  })

  it('rejects edges with malformed handle format', () => {
    const xyEdge: XYFlowEdge = {
      id: 'bad-edge',
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'invalid-handle-format',
      targetHandle: 'in:port-1',
    }

    const result = xyFlowEdgeToDomainEdge(xyEdge)
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.message).toContain('Invalid source handle')
    }
  })

  it('rejects edges with wrong source handle direction', () => {
    const xyEdge: XYFlowEdge = {
      id: 'bad-edge',
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'in:out-1', // Should be out:*, not in:*
      targetHandle: 'in:in-1',
    }

    const result = xyFlowEdgeToDomainEdge(xyEdge)
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.message).toContain('Source handle must be out type')
    }
  })

  it('rejects edges with wrong target handle direction', () => {
    const xyEdge: XYFlowEdge = {
      id: 'bad-edge',
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'out:out-1',
      targetHandle: 'out:in-1', // Should be in:*, not out:*
    }

    const result = xyFlowEdgeToDomainEdge(xyEdge)
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.message).toContain('Target handle must be in type')
    }
  })

  it('rejects edges with unknown direction in handle', () => {
    const xyEdge: XYFlowEdge = {
      id: 'bad-edge',
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'unknown:out-1',
      targetHandle: 'in:in-1',
    }

    const result = xyFlowEdgeToDomainEdge(xyEdge)
    expect(result.type).toBe('error')
  })

  it('reports all errors when extracting multiple domain edges', () => {
    const edges: XYFlowEdge[] = [
      {
        id: 'good-edge',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'out:out-1',
        targetHandle: 'in:in-1',
      },
      {
        id: 'bad-edge-1',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'invalid',
        targetHandle: 'in:in-2',
      },
      {
        id: 'bad-edge-2',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'out:out-2',
        targetHandle: 'out:in-2', // Wrong direction
      },
    ]

    const result = extractDomainEdges(edges)
    expect(result.valid).toHaveLength(1)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toContain('Invalid source handle')
    expect(result.errors[1]).toContain('Target handle must be in type')
  })
})

describe('domainNodeToXYFlowNode', () => {
  it('converts node with input ports', () => {
    const node = createMockNode({
      id: 'node-1',
      name: 'Input Node',
      inputs: {
        type: 'Some',
        value: [createMockPort('data-in', 'input'), createMockPort('config-in', 'input')],
      },
    })

    const xyNode = domainNodeToXYFlowNode(node)
    const inputs = xyNode.data.inputs as NodePort[]
    expect(inputs).toHaveLength(2)
    expect(inputs[0]!.id).toBe('data-in')
    expect(inputs[1]!.id).toBe('config-in')
  })

  it('converts node with output ports', () => {
    const node = createMockNode({
      id: 'node-1',
      name: 'Output Node',
      outputs: {
        type: 'Some',
        value: [createMockPort('result-out', 'output'), createMockPort('error-out', 'output')],
      },
    })

    const xyNode = domainNodeToXYFlowNode(node)
    const outputs = xyNode.data.outputs as NodePort[]
    expect(outputs).toHaveLength(2)
    expect(outputs[0]!.id).toBe('result-out')
    expect(outputs[1]!.id).toBe('error-out')
  })

  it('handles node with None inputs/outputs', () => {
    const node = createMockNode({
      id: 'node-1',
      name: 'No Ports Node',
      inputs: { type: 'None' },
      outputs: { type: 'None' },
    })

    const xyNode = domainNodeToXYFlowNode(node)
    expect(xyNode.data.inputs).toEqual([])
    expect(xyNode.data.outputs).toEqual([])
  })

  it('preserves node position exactly', () => {
    const node = createMockNode({
      id: 'node-1',
      position: { x: 123.456, y: 789.012 },
    })

    const xyNode = domainNodeToXYFlowNode(node)
    expect(xyNode.position.x).toBe(123.456)
    expect(xyNode.position.y).toBe(789.012)
  })
})

describe('domainEdgeToXYFlowEdge', () => {
  it('generates deterministic handle IDs', () => {
    const edge: Edge = {
      from: { nodeId: 'node-1', portId: 'my-output' },
      to: { nodeId: 'node-2', portId: 'my-input' },
    }

    const xyEdge = domainEdgeToXYFlowEdge(edge)
    expect(xyEdge.sourceHandle).toBe('out:my-output')
    expect(xyEdge.targetHandle).toBe('in:my-input')
  })

  it('generates unique edge IDs', () => {
    const edge1: Edge = {
      from: { nodeId: 'a', portId: 'out' },
      to: { nodeId: 'b', portId: 'in' },
    }

    const edge2: Edge = {
      from: { nodeId: 'c', portId: 'out' },
      to: { nodeId: 'd', portId: 'in' },
    }

    const xyEdge1 = domainEdgeToXYFlowEdge(edge1)
    const xyEdge2 = domainEdgeToXYFlowEdge(edge2)
    expect(xyEdge1.id).not.toBe(xyEdge2.id)
  })

  it('includes original edge data for preservation', () => {
    const edge: Edge = {
      from: { nodeId: 'node-1', portId: 'out' },
      to: { nodeId: 'node-2', portId: 'in' },
    }

    const xyEdge = domainEdgeToXYFlowEdge(edge)
    expect(xyEdge.data).toBeDefined()
    expect((xyEdge.data as { _domainEdge: Edge })._domainEdge.from).toEqual({ nodeId: 'node-1', portId: 'out' })
  })
})

describe('extractDomainNodes', () => {
  it('extracts valid domain nodes and reports errors separately', () => {
    const preservedNode = createMockNode({ id: 'good-node', position: { x: 0, y: 0 } })

    const validNode: XYFlowNode = {
      id: 'good-node',
      position: { x: 100, y: 200 },
      data: { _domainNode: preservedNode },
    }

    // A node without position is still valid due to minimal node construction
    const minimalNode: XYFlowNode = {
      id: 'minimal-node',
      position: { x: 0, y: 0 },
      data: {},
    }

    const result = extractDomainNodes([validNode, minimalNode])
    expect(result.valid).toHaveLength(2)
    expect(result.errors).toHaveLength(0)
  })
})
