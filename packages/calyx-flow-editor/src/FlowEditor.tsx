import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Position, Handle,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'

type TextUpdaterNodeData = {
  value: number
}

const initialNodes: Node<TextUpdaterNodeData>[] = [
  {
    id: 'node-1',
    type: 'textUpdater',
    position: { x: 0, y: 0 },
    data: { value: 123 },
  },
  {
    id: 'n2',
    position: { x: 100, y: 100 },
    data: { value: 456 },
  },
]

const initialEdges: Edge[] = [
  // {
  //   id: 'n1-n2',
  //   source: 'node-1',
  //   target: 'n2',
  // },
]

export function TextUpdaterNode() {
  const onChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
    console.log(evt.target.value)
  }, [])

  return (
    <div className="h-12.5 rounded-[5px] border border-solid border-[#888] bg-white p-1.25">
      <div>
        <label className="block text-[12px] text-[#777]" htmlFor="text">
          Text:
        </label>
        <Button variant={'secondary'}>Click me</Button>
        <input id="text" name="text" onChange={onChange} className="nodrag" />
      </div>
    </div>
  )
}

function TestHandleNode() {
  const leftHandles = [
    { id: 'source', type: 'source' as const, position: Position.Left },
  ]

  const rightHandles = [
    { id: 'a', type: 'target' as const, position: Position.Right },
    { id: 'b', type: 'target' as const, position: Position.Right },
  ]

  return (
    <div className="custom-node" style={{ padding: '10px 20px', position: 'relative' }}>
      <div>Custom Node Content</div>
      {leftHandles.map((h, i) => (
        <Handle
          key={h.id}
          type={h.type}
          position={h.position}
          id={h.id}
          style={{ top: `${(100 * (i + 1)) / (leftHandles.length + 1)}%` }}
        />
      ))}
      {rightHandles.map((h, i) => (
        <Handle
          key={h.id}
          type={h.type}
          position={h.position}
          id={h.id}
          style={{ top: `${(100 * (i + 1)) / (rightHandles.length + 1)}%` }}
        />
      ))}
    </div>
  )
}

const nodeTypes = {
  textUpdater: TextUpdaterNode,
  testHandle: TestHandleNode,
}

export function FlowEditor() {
  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)

  const onNodesChange = useCallback((changes: NodeChange<Node<TextUpdaterNodeData>>[]) => {
    setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot))
  }, [])
  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot))
  }, [])
  const onConnect = useCallback((params: Edge | Connection) => {
    setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot))
  }, [])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow nodeTypes={nodeTypes} nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
