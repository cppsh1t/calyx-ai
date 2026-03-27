import { Background, Controls, ReactFlow, addEdge, applyEdgeChanges, applyNodeChanges, type EdgeChange, type NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useState } from 'react'

const initialNodes = [
  {
    id: 'node-1',
    type: 'textUpdater',
    position: { x: 0, y: 0 },
    data: { value: 123 },
  },
  {
    id: 'n2',
    position: { x: 100, y: 100 },
    data: { label: 'Node 2' },
  },
]

const initialEdges = [
  {
    id: 'n1-n2',
    source: 'n1',
    target: 'n2',
  },
]

export function TextUpdaterNode() {
  const onChange = useCallback((evt: any) => {
    console.log(evt.target.value)
  }, [])

  return (
    <div className="h-50px p-5px rounded-5px bg-#fff border-solid border-#888 border-1">
      <div>
        <label className="block text-#777 text-12px" htmlFor="text">Text:</label>
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

  const onNodesChange = useCallback(
    (changes: NodeChange<any>[]) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  )
  const onEdgesChange = useCallback((changes: EdgeChange<any>[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)), [])
  const onConnect = useCallback((params: any) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)), [])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow nodeTypes={nodeTypes} nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
