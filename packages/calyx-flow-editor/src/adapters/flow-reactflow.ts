import type { Edge as XYFlowEdge, Node as XYFlowNode } from '@xyflow/react'
import type { Edge, Flow, Node, NodePort } from 'calyx-flow/types'

/**
 * Handle ID formatters and parsers for deterministic handle identification.
 *
 * Format:
 * - Input handles: `in:{portId}`
 * - Output handles: `out:{portId}`
 */

export type HandleDirection = 'in' | 'out'

export type ParsedHandleId =
  | { type: 'success'; direction: HandleDirection; portId: string }
  | { type: 'error'; reason: 'invalid_format' | 'unknown_direction'; raw: string }

/**
 * Format a port ID into a deterministic handle ID.
 *
 * @param direction - The direction of the handle (input/output)
 * @param portId - The port identifier
 * @returns Formatted handle ID in format `{direction}:{portId}`
 */
export function formatHandleId(direction: HandleDirection, portId: string): string {
  return `${direction}:${portId}`
}

/**
 * Parse a handle ID into its direction and portId components.
 *
 * @param handleId - The handle ID string (e.g., "in:data", "out:result")
 * @returns Parsed result with success type or error type
 */
export function parseHandleId(handleId: string): ParsedHandleId {
  const parts = handleId.split(':')

  if (parts.length !== 2) {
    return { type: 'error', reason: 'invalid_format', raw: handleId }
  }

  const direction = parts[0]
  const portId = parts[1]

  if (!portId) {
    return { type: 'error', reason: 'invalid_format', raw: handleId }
  }

  if (direction !== 'in' && direction !== 'out') {
    return { type: 'error', reason: 'unknown_direction', raw: handleId }
  }

  return {
    type: 'success',
    direction: direction as HandleDirection,
    portId,
  }
}

/**
 * Result type for adapter operations.
 */
export type AdapterResult<T> = { type: 'success'; data: T } | { type: 'error'; message: string; details?: unknown }

/**
 * Convert a domain Flow to XYFlow nodes and edges.
 *
 * This is a pure function that maps the canonical Flow state to XYFlow's
 * internal representation. Handle IDs use deterministic format:
 * - Input handles: `in:{portId}`
 * - Output handles: `out:{portId}`
 *
 * @param flow - The domain Flow object from calyx-flow
 * @returns Adapter result containing XYFlow nodes and edges
 */
export function flowToReactFlow(flow: Flow): AdapterResult<{
  nodes: XYFlowNode[]
  edges: XYFlowEdge[]
}> {
  try {
    const nodes: XYFlowNode[] = []
    const edges: XYFlowEdge[] = []

    // Convert nodes
    if (flow.nodes.type === 'Some' && flow.nodes.value) {
      for (const node of flow.nodes.value) {
        const xyNode = domainNodeToXYFlowNode(node)
        nodes.push(xyNode)
      }
    }

    // Convert edges
    if (flow.edges.type === 'Some' && flow.edges.value) {
      for (const edge of flow.edges.value) {
        const xyEdge = domainEdgeToXYFlowEdge(edge)
        edges.push(xyEdge)
      }
    }

    return { type: 'success', data: { nodes, edges } }
  } catch (error) {
    return {
      type: 'error',
      message: 'Failed to convert Flow to XYFlow format',
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Convert a domain Node to an XYFlow Node.
 *
 * Preserves:
 * - Node ID
 * - Position (x, y)
 * - Input/output port definitions (in data property for custom node rendering)
 *
 * @param node - Domain Node from calyx-flow
 * @returns XYFlow Node with extended data property
 */
export function domainNodeToXYFlowNode(node: Node): XYFlowNode {
  // Extract input/output ports for handle rendering
  const inputs: NodePort[] = node.inputs.type === 'Some' && node.inputs.value ? node.inputs.value : []
  const outputs: NodePort[] = node.outputs.type === 'Some' && node.outputs.value ? node.outputs.value : []
  // Extract parameters for in-node editing
  const parameters = node.parameters.type === 'Some' && node.parameters.value ? node.parameters.value : []

  return {
    id: node.id,
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.name,
      description: node.description,
      inputs,
      outputs,
      parameters,
      // Include original node data for round-trip preservation
      _domainNode: node,
    },
    type: 'flowNode',
  }
}

/**
 * Convert a domain Edge to an XYFlow Edge.
 *
 * Uses deterministic handle format:
 * - sourceHandle: `out:{portId}`
 * - targetHandle: `in:{portId}`
 *
 * @param edge - Domain Edge from calyx-flow
 * @returns XYFlow Edge with handle IDs
 */
export function domainEdgeToXYFlowEdge(edge: Edge): XYFlowEdge {
  const sourceHandle = formatHandleId('out', edge.from.portId)
  const targetHandle = formatHandleId('in', edge.to.portId)

  return {
    id: `e-${edge.from.nodeId}-${edge.from.portId}-${edge.to.nodeId}-${edge.to.portId}`,
    source: edge.from.nodeId,
    target: edge.to.nodeId,
    sourceHandle,
    targetHandle,
    // Preserve original edge data for round-trip
    data: {
      _domainEdge: edge,
    },
  }
}

/**
 * Convert XYFlow nodes and edges back to a domain Flow.
 *
 * This is a pure function that extracts canonical Flow state from XYFlow's
 * representation. Validates handle IDs and returns error for invalid/unknown formats.
 *
 * @param params - Object containing XYFlow nodes, edges, and original flow name
 * @returns Adapter result containing domain Flow
 */
export function reactFlowToFlow(params: { nodes: XYFlowNode[]; edges: XYFlowEdge[]; name: string }): AdapterResult<Flow> {
  try {
    const { nodes, edges, name } = params

    // Convert nodes back to domain format
    const domainNodes: Node[] = []
    for (const xyNode of nodes) {
      const domainNodeResult = xyFlowNodeToDomainNode(xyNode)
      if (domainNodeResult.type === 'error') {
        return domainNodeResult
      }
      domainNodes.push(domainNodeResult.data)
    }

    // Convert edges back to domain format
    const domainEdges: Edge[] = []
    for (const xyEdge of edges) {
      const domainEdgeResult = xyFlowEdgeToDomainEdge(xyEdge)
      if (domainEdgeResult.type === 'error') {
        return domainEdgeResult
      }
      domainEdges.push(domainEdgeResult.data)
    }

    const flow: Flow = {
      name,
      nodes: { type: 'Some', value: domainNodes },
      edges: { type: 'Some', value: domainEdges },
    }

    return { type: 'success', data: flow }
  } catch (error) {
    return {
      type: 'error',
      message: 'Failed to convert XYFlow format to Flow',
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Convert an XYFlow Node back to a domain Node.
 *
 * Preserves:
 * - Node ID
 * - Position (x, y)
 * - Original domain node data if available (for parameters, executor, etc.)
 *
 * @param xyNode - XYFlow Node
 * @returns Adapter result containing domain Node
 */
export function xyFlowNodeToDomainNode(xyNode: XYFlowNode): AdapterResult<Node> {
  try {
    // If the node has preserved domain data, use it as base
    const preservedNode: Node | undefined = xyNode.data?._domainNode as Node | undefined

    if (preservedNode) {
      // Update position from current XYFlow state, preserve everything else
      return {
        type: 'success',
        data: {
          ...preservedNode,
          position: {
            x: xyNode.position.x,
            y: xyNode.position.y,
          },
        },
      }
    }

    // No preserved data - construct minimal node
    // This should not happen in normal usage but handles edge cases
    const label = xyNode.data?.label
    const description = xyNode.data?.description
    return {
      type: 'success',
      data: {
        id: xyNode.id,
        name: typeof label === 'string' ? label : xyNode.id,
        description: typeof description === 'string' ? description : '',
        position: {
          x: xyNode.position.x,
          y: xyNode.position.y,
        },
        symbol: { type: 'None' },
        group: { type: 'None' },
        parameters: { type: 'None' },
        inputs: { type: 'None' },
        outputs: { type: 'None' },
        executor: {
          async execute() {
            // No-op executor for minimal nodes
          },
        },
      },
    }
  } catch (error) {
    return {
      type: 'error',
      message: `Failed to convert node ${xyNode.id} to domain format`,
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Convert an XYFlow Edge back to a domain Edge.
 *
 * Validates handle IDs and returns error for invalid/unknown formats.
 * Preserves exact from.nodeId/from.portId and to.nodeId/to.portId semantics.
 *
 * @param xyEdge - XYFlow Edge
 * @returns Adapter result containing domain Edge
 */
export function xyFlowEdgeToDomainEdge(xyEdge: XYFlowEdge): AdapterResult<Edge> {
  // Parse source handle (must be output handle)
  const sourceHandleResult = xyEdge.sourceHandle
    ? parseHandleId(xyEdge.sourceHandle)
    : { type: 'error' as const, reason: 'invalid_format' as const, raw: 'undefined' }

  if (sourceHandleResult.type === 'error') {
    return {
      type: 'error',
      message: `Invalid source handle format on edge ${xyEdge.id}: ${xyEdge.sourceHandle}`,
      details: { handle: xyEdge.sourceHandle, reason: sourceHandleResult.reason },
    }
  }

  if (sourceHandleResult.direction !== 'out') {
    return {
      type: 'error',
      message: `Source handle must be out type on edge ${xyEdge.id}: ${xyEdge.sourceHandle}`,
      details: { handle: xyEdge.sourceHandle, direction: sourceHandleResult.direction },
    }
  }

  // Parse target handle (must be input handle)
  const targetHandleResult = xyEdge.targetHandle
    ? parseHandleId(xyEdge.targetHandle)
    : { type: 'error' as const, reason: 'invalid_format' as const, raw: 'undefined' }

  if (targetHandleResult.type === 'error') {
    return {
      type: 'error',
      message: `Invalid target handle format on edge ${xyEdge.id}: ${xyEdge.targetHandle}`,
      details: { handle: xyEdge.targetHandle, reason: targetHandleResult.reason },
    }
  }

  if (targetHandleResult.direction !== 'in') {
    return {
      type: 'error',
      message: `Target handle must be in type on edge ${xyEdge.id}: ${xyEdge.targetHandle}`,
      details: { handle: xyEdge.targetHandle, direction: targetHandleResult.direction },
    }
  }

  const edge: Edge = {
    from: {
      nodeId: xyEdge.source,
      portId: sourceHandleResult.portId,
    },
    to: {
      nodeId: xyEdge.target,
      portId: targetHandleResult.portId,
    },
  }

  return { type: 'success', data: edge }
}

/**
 * Extract domain edges from XYFlow edges.
 * Alias for xyFlowEdgeToDomainEdge mapped over an array.
 *
 * @param edges - Array of XYFlow edges
 * @returns Array of domain edges (filters out errors)
 */
export function extractDomainEdges(edges: XYFlowEdge[]): { valid: Edge[]; errors: string[] } {
  const valid: Edge[] = []
  const errors: string[] = []

  for (const xyEdge of edges) {
    const result = xyFlowEdgeToDomainEdge(xyEdge)
    if (result.type === 'success') {
      valid.push(result.data)
    } else {
      errors.push(result.message)
    }
  }

  return { valid, errors }
}

/**
 * Extract domain nodes from XYFlow nodes.
 * Alias for xyFlowNodeToDomainNode mapped over an array.
 *
 * @param nodes - Array of XYFlow nodes
 * @returns Array of domain nodes (filters out errors)
 */
export function extractDomainNodes(nodes: XYFlowNode[]): { valid: Node[]; errors: string[] } {
  const valid: Node[] = []
  const errors: string[] = []

  for (const xyNode of nodes) {
    const result = xyFlowNodeToDomainNode(xyNode)
    if (result.type === 'success') {
      valid.push(result.data)
    } else {
      errors.push(result.message)
    }
  }

  return { valid, errors }
}
