import type { Edge, Flow, FlowConfig, FlowRaw, Node, NodeExecuteContext, NodeExecutor, NodeInputPort, NodeOutputPort, Option } from '@/types'
import { FlowConfigSchema } from '@/types/core/flow'
import { catchPromise } from '@/utils/promise'
import { None, Some } from '@/utils/structure'
import { isEmpty } from 'radash'
import { createNodeBuilder } from './node'
import type { NodeRegistry } from './registry'

function findOutputPortNext(output: NodeOutputPort, edges: Edge[]) {
  const targetEdges = edges.filter((item) => item.sourcePortId === output.id)
  return targetEdges
}

function checkExecutorAvailable(executor: NodeExecutor, inputs: Option<NodeInputPort[]>, targetOutput: NodeOutputPort) {
  if (executor.used) return false
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

function makeExecutorContext(node: Node, signal: AbortController): NodeExecuteContext {
  return { inputs: node.inputs, parameters: node.parameters, abort: signal }
}

async function executeNode(node: Node, nodes: Node[], edges: Edge[], signal: AbortController) {
  const remainExecutors = node.executors.filter((item) => !item.used)
  if (node.outputs.type === 'None') return
  const outputs = node.outputs.value
  await Promise.all(
    remainExecutors.map(async (executor) => {
      const targetOutput = outputs.find((item) => item.name === executor.outputName)
      if (!targetOutput) return
      if (checkExecutorAvailable(executor, node.inputs, targetOutput)) {
        const ctx = makeExecutorContext(node, signal)
        executor.used = true
        node.runningTimes += 1
        const result = await catchPromise(executor.func(ctx))
        node.runningTimes -= 1
        if (result.type === 'success') {
          if (result.value.continue) await setNodeOutput(targetOutput, nodes, edges, result.value.data, signal)
        } else {
          //TODO: impl error handle in future
        }
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

async function setNodeInput(nodeInput: NodeInputPort, nodes: Node[], edges: Edge[], value: any, signal: AbortController) {
  const valParse = nodeInput.schema.safeParse(value)
  if (!valParse.success) {
    throw new Error(`Input port "${nodeInput.name}" (id: ${nodeInput.id}) schema validation failed: ${valParse.error.message}`)
  }
  nodeInput.value = Some(valParse.data)
  const node = findNodeByInputPortId(nodeInput.id, nodes)
  if (node.type === 'None') return
  await executeNode(node.value, nodes, edges, signal)
}

async function setNodeOutput(nodeOutput: NodeOutputPort, nodes: Node[], edges: Edge[], value: any, signal: AbortController) {
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
      await setNodeInput(targetInput, nodes, edges, valParse.data, signal)
    })
  )
}

function findStartNode(flowRaw: FlowRaw): Node {
  const startNodes = flowRaw.nodes.filter((item) => item.type.includes('start-node'))
  if (isEmpty(startNodes)) {
    throw new Error(`Flow "${flowRaw.name}" has no start node. Expected exactly one node whose type includes "start-node".`)
  }
  if (startNodes.length > 1) {
    throw new Error(`Flow "${flowRaw.name}" has multiple start nodes: ${startNodes.map((item) => item.id).join(', ')}. Expected exactly one start node.`)
  }
  const startNode = startNodes[0]!

  if (startNode.inputs.type === 'Some') {
    throw new Error(`Start node "${startNode.id}" must not define input ports.`)
  }

  if (startNode.outputs.type === 'None') {
    throw new Error(`Start node "${startNode.id}" must define at least one output port.`)
  }
  return startNode
}

function compileFlow(flowConfig: FlowConfig, registry: NodeRegistry): Flow {
  const parseRes = FlowConfigSchema.safeParse(flowConfig)
  if (!parseRes.success) {
    throw new Error(`FlowConfig validation failed: ${parseRes.error.message}`)
  }

  const validatedConfig = parseRes.data

  const buildFlowRaw = () => {
    const nodes: Node[] = validatedConfig.nodes.map((nodeData) => {
      return createNodeBuilder()
        .setId(nodeData.id)
        .setKey(nodeData.key)
        .setName(nodeData.name)
        .setParameters(nodeData.parameters)
        .setInputs(nodeData.inputs)
        .setOutputs(nodeData.outputs)
        .setRegistry(registry)
        .build()
    })

    const edges: Edge[] = validatedConfig.edges.map((edge) => ({ ...edge }))

    const flowRaw: FlowRaw = {
      name: validatedConfig.name,
      nodes,
      edges,
    }
    return flowRaw
  }

  //TODO: Check boundary conditions

  const buildFlow = (rawBuilder: () => FlowRaw): Flow => {
    const flow: Flow = {
      getName: function (): string {
        return validatedConfig.name
      },
      getRunningStatus: function (): boolean {
        //TODO: impl in future
        throw new Error('Function not implemented.')
      },
      fork: function (): Flow {
        return buildFlow(rawBuilder)
      },
      run: async function (signal: AbortController): Promise<FlowRaw> {
        const flowRaw = buildFlowRaw()
        const startNode = findStartNode(flowRaw)
        await executeNode(startNode, flowRaw.nodes, flowRaw.edges, signal)
        return flowRaw
      },
    }
    return flow
  }

  return buildFlow(buildFlowRaw)
}
