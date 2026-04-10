import {
  validateAtLeastOneStartNode,
  validateEdgeNodesExist,
  validateEdgeSchemasAreCompatible,
  validateEdgeSourcePortsBelongToSourceOutputs,
  validateEdgeTargetPortsBelongToTargetInputs,
  validateFlowStructure,
  validateGraphIsAcyclic,
  validateInputPortsHaveSingleIncomingEdge,
  validateNodeIdsAreUnique,
  validateNoSelfLoops,
  validateStartNodesHaveNoIncomingEdges,
  validateStartNodesHaveOutputs,
} from '@/core/flow-validation.ts'
import {
  type Edge,
  type FlowConfig,
  type NodeExecuteContext,
  type NodeInputPortInstance,
  type NodeInstance,
  type NodeOutputPortInstance,
  type NodeParameterInstance,
  type Option,
} from '@/types'
import { FlowConfigSchema, type Flow, type FlowInstance } from '@/types/core/flow'
import { None, Some } from '@/utils/structure'
import { v4 as uuid } from 'uuid'
import { buildNodeInstance } from './node'
import type { NodeRegistry } from './registry'

function getAvailableOutputs(node: NodeInstance): Option<NodeOutputPortInstance[]> {
  if (node.outputs.type === 'None') return None
  const remainOutputs = node.outputs.value.filter((output) => {
    if (output.used) return false
    if (output.requiredInputs.type === 'None') return true
    const requiredInputs = output.requiredInputs.value
    const nodeInputs = node.inputs.type === 'Some' ? node.inputs.value : []
    return requiredInputs.every((reqInputName) => nodeInputs.some((input) => input.name === reqInputName && input.value.type === 'Some'))
  })
  return Some(remainOutputs)
}

function makeExecutorContext(
  currentNode: NodeInstance,
  inputs: Option<NodeInputPortInstance[]>,
  parameters: Option<NodeParameterInstance[]>,
  signal: AbortSignal
): NodeExecuteContext {
  return {
    currentNode,
    inputs,
    parameters,
    signal,
  }
}

function findOutputPortNextEdges(nodeOutput: NodeOutputPortInstance, edges: Edge[]): Option<Edge[]> {
  const nextEdges = edges.filter((edge) => edge.sourcePortId === nodeOutput.id)
  return nextEdges.length > 0 ? Some(nextEdges) : None
}

function findNodeById(nodes: NodeInstance[], nodeId: string): Option<NodeInstance> {
  const node = nodes.find((item) => item.id === nodeId)
  return node ? Some(node) : None
}

function findNodeByInputPortId(portId: string, nodes: NodeInstance[]): Option<NodeInstance> {
  const node = nodes.find((item) => item.inputs.type === 'Some' && item.inputs.value.find((sub) => sub.id === portId))
  return node ? Some(node) : None
}

async function checkNodeAndExecute(nodes: NodeInstance[], edges: Edge[], currentNode: NodeInstance, abort: AbortController) {
  const availableOutputsOption = getAvailableOutputs(currentNode)
  if (availableOutputsOption.type === 'None') return
  const availableOutputs = availableOutputsOption.value

  try {
    await Promise.all(
      availableOutputs.map(async (output) => {
        if (abort.signal.aborted) return
        output.used = true
        const executor = output.executor
        const ctx = makeExecutorContext(currentNode, currentNode.inputs, currentNode.parameters, abort.signal)
        currentNode.runningTimes += 1
        const result = await executor(ctx)
        currentNode.runningTimes -= 1
        if (!result.continue) return
        if (abort.signal.aborted) return
        await setNodeOutput(nodes, edges, output, result.data, abort)
      })
    )
  } catch (error) {
    abort.abort()
    throw error
  }
}

async function setNodeOutput(nodes: NodeInstance[], edges: Edge[], nodeOutput: NodeOutputPortInstance, value: unknown, abort: AbortController) {
  const valParse = nodeOutput.schema.safeParse(value)
  if (!valParse.success) {
    throw new Error(`Output port "${nodeOutput.name}" (id: ${nodeOutput.id}) schema validation failed: ${valParse.error.message}`)
  }
  nodeOutput.value = Some(valParse.data)
  const nextEdges = findOutputPortNextEdges(nodeOutput, edges)
  if (nextEdges.type === 'None') {
    return
  }
  await Promise.all(
    nextEdges.value.map(async (edge) => {
      const targetNodeOpt = findNodeById(nodes, edge.targetNodeId)
      if (targetNodeOpt.type === 'None') return
      const targetNode = targetNodeOpt.value
      if (targetNode.inputs.type === 'None') {
        throw new Error(
          `Target node "${targetNode.name}" (id: ${targetNode.id}) has no input ports, but received data from output port "${nodeOutput.name}" (id: ${nodeOutput.id})`
        )
      }
      const targetInputs = targetNode.inputs.value
      const targetInput = targetInputs.find((input) => input.id === edge.targetPortId)
      if (!targetInput) {
        throw new Error(`Target input port with id "${edge.targetPortId}" not found in target node "${targetNode.name}" (id: ${targetNode.id})`)
      }
      if (abort.signal.aborted) return
      if (targetInput.used) {
        throw new Error(
          `Target input port "${targetInput.name}" (id: ${targetInput.id}) in node "${targetNode.name}" (id: ${targetNode.id}) has already been used/consumed`
        )
      }
      await setNodeInput(nodes, edges, targetInput, valParse.data, abort)
    })
  )
}

async function setNodeInput(nodes: NodeInstance[], edges: Edge[], nodeInput: NodeInputPortInstance, value: unknown, abort: AbortController) {
  const valParse = nodeInput.schema.safeParse(value)
  if (!valParse.success) {
    throw new Error(`Input port "${nodeInput.name}" (id: ${nodeInput.id}) schema validation failed: ${valParse.error.message}`)
  }
  nodeInput.value = Some(valParse.data)
  nodeInput.used = true
  const currentNode = findNodeByInputPortId(nodeInput.id, nodes)
  if (currentNode.type === 'None') return
  if (abort.signal.aborted) return
  await checkNodeAndExecute(nodes, edges, currentNode.value, abort)
}

function findStartNodes(nodes: NodeInstance[]): NodeInstance[] {
  return nodes.filter((node) => node.type.includes('start-node'))
}

function buildFlow(flowConfig: FlowConfig, registry: NodeRegistry): Flow {
  const parseRes = FlowConfigSchema.safeParse(flowConfig)
  if (!parseRes.success) {
    throw new Error(`FlowConfig validation failed: ${parseRes.error.message}`)
  }

  const validatedConfig = parseRes.data

  const validationNodes: NodeInstance[] = validatedConfig.nodes.map((nodeData) => buildNodeInstance(registry, nodeData))
  const validationEdges: Edge[] = validatedConfig.edges.map((edge) => ({ ...edge }))
  validateFlowStructure(validationNodes, validationEdges)

  const buildFlowRaw = () => {
    const nodes: NodeInstance[] = validatedConfig.nodes.map((nodeData) => {
      return buildNodeInstance(registry, nodeData)
    })

    const edges: Edge[] = validatedConfig.edges.map((edge) => ({ ...edge }))

    const flowRaw: FlowInstance = {
      id: uuid(),
      name: validatedConfig.name,
      nodes,
      edges,
    }
    return flowRaw
  }

  let running = false
  const flow: Flow = {
    getName: function (): string {
      return validatedConfig.name
    },
    getRunningStatus: function (): boolean {
      return running
    },
    run: async function (abort?: AbortController): Promise<FlowInstance> {
      if (running) {
        throw new Error('Flow is already running')
      }
      abort ??= new AbortController()
      const flowRaw = buildFlowRaw()
      const startNodes = findStartNodes(flowRaw.nodes)
      running = true
      try {
        await Promise.all(startNodes.map((startNode) => checkNodeAndExecute(flowRaw.nodes, flowRaw.edges, startNode, abort)))
      } catch (error) {
        throw error
      } finally {
        running = false
      }

      return flowRaw
    },
  }

  return flow
}

export { buildFlow }