import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
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
  {
    id: 'n1-n2',
    source: 'node-1',
    target: 'n2',
  },
]

export function TextUpdaterNode() {
  const onChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
    console.log(evt.target.value)
  }, [])

  return (
    <div className="h-[50px] rounded-[5px] border border-solid border-[#888] bg-[#fff] p-[5px]">
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

const nodeTypes = {
  textUpdater: TextUpdaterNode,
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
