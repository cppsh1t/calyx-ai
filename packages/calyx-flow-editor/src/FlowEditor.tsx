/** @jsxImportSource react */

import { extractDomainEdges, extractDomainNodes, flowToReactFlow, parseHandleId } from '@/adapters/flow-reactflow.ts'
import { FlowNode } from '@/components/FlowNode.tsx'
import {
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Flow } from 'calyx-flow'
import type { NodeParameter, Option } from 'calyx-flow/types'
import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Props for the controlled FlowEditor component.
 *
 * Contract:
 * - `flow` is the canonical state (domain Flow from calyx-flow)
 * - `onSave` receives the updated Flow when user triggers save
 * - Internal XYFlow state is derived from Flow (not the source of truth)
 *
 * State ownership direction:
 *   Flow (canonical) -> XYFlow nodes/edges (derived display state)
 *   User interactions -> onSave callback -> parent updates Flow
 */
export type FlowEditorProps = {
  /** The canonical Flow object from calyx-flow */
  flow: Flow
  /** Callback invoked when the flow should be saved */
  onSave: (flow: Flow) => void | Promise<void>
}

/**
 * Custom node types registry for ReactFlow.
 * Maps node type keys to custom component implementations.
 */
const nodeTypes: NodeTypes = {
  default: FlowNode,
}

/**
 * Validate a connection attempt between handles.
 * Blocks invalid handle connections based on adapter handle contract.
 *
 * Valid connections:
 * - Source handle must have format `out:{portId}` (output direction)
 * - Target handle must have format `in:{portId}` (input direction)
 *
 * @param connection - The connection attempt from XYFlow (can be Connection or Edge)
 * @returns true if the connection is valid, false otherwise
 */
function isValidConnection(connection: Connection | Edge): boolean {
  // Validate source handle (must be out:{portId})
  if (!connection.sourceHandle) {
    return false
  }
  const sourceParsed = parseHandleId(connection.sourceHandle)
  if (sourceParsed.type === 'error' || sourceParsed.direction !== 'out') {
    return false
  }

  // Validate target handle (must be in:{portId})
  if (!connection.targetHandle) {
    return false
  }
  const targetParsed = parseHandleId(connection.targetHandle)
  if (targetParsed.type === 'error' || targetParsed.direction !== 'in') {
    return false
  }

  return true
}

/**
 * Extended node data that includes parameter change callback.
 * This is injected by FlowEditor at runtime.
 */
type ExtendedNodeData = {
  label: string
  description?: string
  inputs?: unknown[]
  outputs?: unknown[]
  parameters?: NodeParameter[]
  onParameterChange?: (paramName: string, value: Option<unknown>) => void
  _domainNode?: {
    id: string
    name: string
    description: string
    position: { x: number; y: number }
    symbol: { type: 'Some' | 'None'; value?: string }
    group: { type: 'Some' | 'None'; value?: string }
    parameters: { type: 'Some' | 'None'; value?: NodeParameter[] }
    inputs: { type: 'Some' | 'None'; value?: unknown[] }
    outputs: { type: 'Some' | 'None'; value?: unknown[] }
    executor: { execute: (ctx: unknown) => Promise<void> | void }
  }
}

/**
 * Controlled Flow Editor component.
 *
 * Accepts a Flow object and an onSave callback. The Flow is the canonical
 * source of truth; XYFlow internal state is derived for display purposes.
 *
 * Key behaviors:
 * - Flow prop is converted to XYFlow nodes/edges via adapter
 * - Invalid handle connections are blocked (no persisted invalid edge)
 * - onSave receives canonical Flow, never XYFlow-native shape
 * - Parameter changes update node state deterministically
 *
 * @example
 * ```tsx
 * <FlowEditor
 *   flow={myFlow}
 *   onSave={(updatedFlow) => console.log('Save:', updatedFlow)}
 * />
 * ```
 */
export function FlowEditor({ flow, onSave }: FlowEditorProps) {
  // Derive XYFlow state from canonical Flow
  const initialXYFlow = useMemo(() => {
    const result = flowToReactFlow(flow)
    if (result.type === 'success') {
      return result.data
    }
    // If conversion fails, start with empty state
    return { nodes: [] as Node[], edges: [] as Edge[] }
  }, [flow])

  // Internal XYFlow state (derived from Flow, not source of truth)
  const [nodes, setNodes] = useState<Node[]>(initialXYFlow.nodes)
  const [edges, setEdges] = useState<Edge[]>(initialXYFlow.edges)

  // Sync internal state when flow prop changes
  useEffect(() => {
    const result = flowToReactFlow(flow)
    if (result.type === 'success') {
      setNodes(result.data.nodes)
      setEdges(result.data.edges)
    }
  }, [flow])

  /**
   * Handle parameter value changes for a specific node.
   * Updates the node's _domainNode.parameters and data.parameters.
   */
  const handleParameterChange = useCallback(
    (nodeId: string, paramName: string, value: Option<unknown>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId) {
            return node
          }

          // Get current node data
          const nodeData = node.data as ExtendedNodeData
          const domainNode = nodeData._domainNode

          if (!domainNode) {
            return node
          }

          // Update parameters in domain node
          const currentParams = domainNode.parameters.type === 'Some' && domainNode.parameters.value ? domainNode.parameters.value : []

          const updatedParams = currentParams.map((param: NodeParameter) => (param.name === paramName ? { ...param, value } : param))

          // If parameter doesn't exist, add it (edge case)
          const paramExists = currentParams.some((param: NodeParameter) => param.name === paramName)
          if (!paramExists && currentParams.length > 0) {
            // This shouldn't happen in normal usage
            console.warn(`FlowEditor: Parameter ${paramName} not found in node ${nodeId}`)
          }

          // Create updated domain node with new parameters
          const updatedDomainNode = {
            ...domainNode,
            parameters: {
              type: 'Some' as const,
              value: updatedParams,
            },
          }

          // Return updated node with new data
          return {
            ...node,
            data: {
              ...nodeData,
              parameters: updatedParams,
              _domainNode: updatedDomainNode,
            },
          }
        })
      )
    },
    [setNodes]
  )

  // Inject onParameterChange into node data
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => {
      const nodeData = node.data as ExtendedNodeData
      return {
        ...node,
        data: {
          ...nodeData,
          onParameterChange: (paramName: string, value: Option<unknown>) => {
            handleParameterChange(node.id, paramName, value)
          },
        },
      }
    })
  }, [nodes, handleParameterChange])

  // Handle node changes (position updates, etc.)
  const onNodesChange = useCallback((changes: NodeChange<Node>[]) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)), [])

  // Handle edge changes (selection, removal, etc.)
  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)), [])

  // Handle connection attempts with validation gating
  const onConnect = useCallback(
    (params: Connection) => {
      // Block invalid handle connections
      if (!isValidConnection(params)) {
        return
      }

      setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot))
    },
    [setEdges]
  )

  /**
   * Build canonical Flow from current XYFlow state.
   * Uses adapter to extract domain nodes and edges.
   */
  const buildCanonicalFlow = useCallback((): Flow => {
    // Extract domain nodes from XYFlow nodes
    const { valid: domainNodes, errors: nodeErrors } = extractDomainNodes(nodes)
    if (nodeErrors.length > 0) {
      console.warn('FlowEditor: Errors extracting domain nodes:', nodeErrors)
    }

    // Extract domain edges from XYFlow edges (includes handle validation)
    const { valid: domainEdges, errors: edgeErrors } = extractDomainEdges(edges)
    if (edgeErrors.length > 0) {
      console.warn('FlowEditor: Errors extracting domain edges:', edgeErrors)
    }

    // Build canonical Flow
    const canonicalFlow: Flow = {
      name: flow.name,
      nodes: domainNodes.length > 0 ? { type: 'Some', value: domainNodes } : { type: 'None' },
      edges: domainEdges.length > 0 ? { type: 'Some', value: domainEdges } : { type: 'None' },
    }

    return canonicalFlow
  }, [flow.name, nodes, edges])

  /**
   * Trigger save by converting XYFlow state to canonical Flow and calling onSave.
   */
  const handleSave = useCallback(() => {
    const canonicalFlow = buildCanonicalFlow()
    onSave(canonicalFlow)
  }, [buildCanonicalFlow, onSave])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          isValidConnection={isValidConnection}
          fitView
        />
      </div>
      {/* Save button for triggering canonical save */}
      <div
        style={{
          padding: '8px',
          borderTop: '1px solid #ddd',
          background: '#f5f5f5',
        }}
      >
        <button type="button" onClick={handleSave} data-action="save-flow">
          Save Flow
        </button>
      </div>
    </div>
  )
}

export default FlowEditor
