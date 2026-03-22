import type { Edge, Node, NodeExecutor, NodeInputPort, NodeOutputPort, Option } from '@/types'
import { None, Some } from '@/utils/structure'

//TODO: update node state

function findOutputPortNext(output: NodeOutputPort, edges: Edge[]) {
  const targetEdges = edges.filter((item) => item.sourcePortId === output.id)
  return targetEdges
}

function checkExecutorAvaible(executor: NodeExecutor, inputs: Option<NodeInputPort[]>, targetOutput: NodeOutputPort) {
  if (executor.state !== 'wait') return false
  const requiredInputs = targetOutput.requiredInputs
  if (requiredInputs.type === 'None') return true
  if (inputs.type === 'None') return false
  for (const requiredInput of requiredInputs.value) {
    const targetInput = inputs.value.find((item) => item.name === requiredInput)
    if (!targetInput) return false
    if (targetInput.value.type === 'None') return false
  }
  return true
}

function makeExecutorContext() {
  return {}
}

async function executeNode(node: Node, nodes: Node[], edges: Edge[]) {
  if (node.state === 'finish') return
  const remainExecutors = node.executors.filter((item) => item.state === 'wait')
  if (node.outputs.type === 'None') return
  const outputs = node.outputs.value
  await Promise.all(
    remainExecutors.map(async (executor) => {
      const targetOutput = outputs.find((item) => item.name === executor.outputName)
      if (!targetOutput) return
      if (checkExecutorAvaible(executor, node.inputs, targetOutput)) {
        const ctx = makeExecutorContext()
        executor.state = 'running'
        const result = await executor.func(ctx)
        executor.state = 'finish'
        await setNodeOutput(targetOutput, nodes, edges, result)
      }
    })
  )
}

function findNodeById(nodes: Node[], nodeId: string): Option<Node> {
  const node = nodes.find((n) => n.id === nodeId)
  return node ? Some(node) : None
}

function findInputPortById(node: Node, portId: string): Option<NodeInputPort> {
  if (node.inputs.type === 'None') return None
  const port = node.inputs.value.find((p) => p.id === portId)
  return port ? Some(port) : None
}

function findNodeByInputPortId(portId: string, nodes: Node[]): Option<Node> {
  const node = nodes.find((item) => item.inputs.type === 'Some' && item.inputs.value.find((sub) => sub.id === portId))
  return node ? Some(node) : None
}

async function setNodeInput(nodeInput: NodeInputPort, nodes: Node[], edges: Edge[], value: any) {
  const valParse = nodeInput.schema.safeParse(value)
  if (!valParse.success) {
    throw new Error(`Output port "${nodeInput.name}" (id: ${nodeInput.id}) schema validation failed: ${valParse.error.message}`)
  }
  nodeInput.value = Some(valParse.data)
  const node = findNodeByInputPortId(nodeInput.id, nodes)
  if (node.type === 'None') return
  await executeNode(node.value, nodes, edges)
}

async function setNodeOutput(nodeOutput: NodeOutputPort, nodes: Node[], edges: Edge[], value: any) {
  const valParse = nodeOutput.schema.safeParse(value)
  if (!valParse.success) {
    throw new Error(`Output port "${nodeOutput.name}" (id: ${nodeOutput.id}) schema validation failed: ${valParse.error.message}`)
  }
  nodeOutput.value = Some(valParse.data)
  const nextEdges = findOutputPortNext(nodeOutput, edges)
  await Promise.all(
    nextEdges.map(async (edge) => {
      const targetNodeOpt = findNodeById(nodes, edge.targetNodeId)
      if (targetNodeOpt.type === 'None') return

      const targetNode = targetNodeOpt.value
      const targetInputOpt = findInputPortById(targetNode, edge.targetPortId)
      if (targetInputOpt.type === 'None') return

      const targetInput = targetInputOpt.value
      await setNodeInput(targetInput, nodes, edges, value)
    })
  )
}
