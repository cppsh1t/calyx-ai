import type { Edge, Flow, FlowConfig, FlowRaw, Node, NodeExecuteContext, NodeExecutor, NodeInputPort, NodeOutputPort, Option } from '@/types'
import { FlowConfigSchema } from '@/types/core/flow'
import { catchPromise } from '@/utils/promise'
import { None, Some } from '@/utils/structure'
import { isEmpty } from 'radash'
import { v4 as uuidv4 } from 'uuid'
import { createNodeBuilder } from './node'
import type { NodeRegistry } from './registry'

function makeScopedPortKey(nodeId: string, portId: string): string {
  return `${nodeId}::${portId}`
}

function regenerateFlowConfigIds(flowConfig: FlowConfig): FlowConfig {
  const nodeIdMap = new Map<string, string>()
  const inputPortIdMap = new Map<string, string>()
  const outputPortIdMap = new Map<string, string>()

  const nodes = flowConfig.nodes.map((nodeData) => {
    const newNodeId = uuidv4()
    nodeIdMap.set(nodeData.id, newNodeId)

    const inputs = nodeData.inputs?.map((input) => {
      const newInputId = uuidv4()
      inputPortIdMap.set(makeScopedPortKey(nodeData.id, input.id), newInputId)
      return {
        ...input,
        id: newInputId,
      }
    })

    const outputs = nodeData.outputs?.map((output) => {
      const newOutputId = uuidv4()
      outputPortIdMap.set(makeScopedPortKey(nodeData.id, output.id), newOutputId)
      return {
        ...output,
        id: newOutputId,
      }
    })

    return {
      ...nodeData,
      id: newNodeId,
      inputs,
      outputs,
    }
  })

  const edges = flowConfig.edges.map((edge) => {
    const sourceNodeId = nodeIdMap.get(edge.sourceNodeId)
    if (!sourceNodeId) {
      throw new Error(`Cannot remap edge source node id "${edge.sourceNodeId}" during flow fork.`)
    }

    const targetNodeId = nodeIdMap.get(edge.targetNodeId)
    if (!targetNodeId) {
      throw new Error(`Cannot remap edge target node id "${edge.targetNodeId}" during flow fork.`)
    }

    const sourcePortId = outputPortIdMap.get(makeScopedPortKey(edge.sourceNodeId, edge.sourcePortId))
    if (!sourcePortId) {
      throw new Error(`Cannot remap edge source port id "${edge.sourcePortId}" on node "${edge.sourceNodeId}" during flow fork.`)
    }

    const targetPortId = inputPortIdMap.get(makeScopedPortKey(edge.targetNodeId, edge.targetPortId))
    if (!targetPortId) {
      throw new Error(`Cannot remap edge target port id "${edge.targetPortId}" on node "${edge.targetNodeId}" during flow fork.`)
    }

    return {
      ...edge,
      sourceNodeId,
      targetNodeId,
      sourcePortId,
      targetPortId,
    }
  })

  return {
    ...flowConfig,
    nodes,
    edges,
  }
}

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

function validateNodePortAndExecutorBoundary(flowRaw: FlowRaw): void {
  const nodeIdSet = new Set<string>()

  for (const node of flowRaw.nodes) {
    if (nodeIdSet.has(node.id)) {
      throw new Error(`Flow "${flowRaw.name}" has duplicate node id: "${node.id}".`)
    }
    nodeIdSet.add(node.id)

    const inputNames = new Set<string>()
    const inputIds = new Set<string>()
    if (node.inputs.type === 'Some') {
      for (const input of node.inputs.value) {
        if (inputIds.has(input.id)) {
          throw new Error(`Node "${node.id}" has duplicate input port id: "${input.id}".`)
        }
        if (inputNames.has(input.name)) {
          throw new Error(`Node "${node.id}" has duplicate input port name: "${input.name}".`)
        }
        inputIds.add(input.id)
        inputNames.add(input.name)
      }
    }

    const outputNames = new Set<string>()
    const outputIds = new Set<string>()
    if (node.outputs.type === 'Some') {
      for (const output of node.outputs.value) {
        if (outputIds.has(output.id)) {
          throw new Error(`Node "${node.id}" has duplicate output port id: "${output.id}".`)
        }
        if (outputNames.has(output.name)) {
          throw new Error(`Node "${node.id}" has duplicate output port name: "${output.name}".`)
        }
        outputIds.add(output.id)
        outputNames.add(output.name)

        if (output.requiredInputs.type === 'Some') {
          if (node.inputs.type === 'None') {
            throw new Error(`Node "${node.id}" output "${output.name}" declares requiredInputs, but this node has no input ports defined.`)
          }

          for (const requiredInputName of output.requiredInputs.value) {
            if (!inputNames.has(requiredInputName)) {
              throw new Error(`Node "${node.id}" output "${output.name}" requires missing input "${requiredInputName}".`)
            }
          }
        }
      }
    }

    const outputCount = node.outputs.type === 'Some' ? node.outputs.value.length : 0
    if (outputCount !== node.executors.length) {
      throw new Error(`Node "${node.id}" executor/output mismatch: expected ${outputCount} executor(s), got ${node.executors.length}.`)
    }

    const mappedOutputNames = new Set<string>()
    for (const executor of node.executors) {
      if (!outputNames.has(executor.outputName)) {
        throw new Error(`Node "${node.id}" executor binds unknown output "${executor.outputName}".`)
      }
      if (mappedOutputNames.has(executor.outputName)) {
        throw new Error(`Node "${node.id}" has multiple executors bound to output "${executor.outputName}".`)
      }
      mappedOutputNames.add(executor.outputName)
    }

    for (const outputName of outputNames) {
      if (!mappedOutputNames.has(outputName)) {
        throw new Error(`Node "${node.id}" output "${outputName}" has no executor bound.`)
      }
    }
  }
}

function validateEdgeBoundary(flowRaw: FlowRaw): void {
  const nodeById = new Map<string, Node>()
  for (const node of flowRaw.nodes) {
    nodeById.set(node.id, node)
  }

  for (const edge of flowRaw.edges) {
    const sourceNode = nodeById.get(edge.sourceNodeId)
    if (!sourceNode) {
      throw new Error(`Edge references missing source node: "${edge.sourceNodeId}".`)
    }

    const targetNode = nodeById.get(edge.targetNodeId)
    if (!targetNode) {
      throw new Error(`Edge references missing target node: "${edge.targetNodeId}".`)
    }

    const sourceHasOutput = sourceNode.outputs.type === 'Some' && sourceNode.outputs.value.some((item) => item.id === edge.sourcePortId)
    if (!sourceHasOutput) {
      const sourceHasInputWithSameId = sourceNode.inputs.type === 'Some' && sourceNode.inputs.value.some((item) => item.id === edge.sourcePortId)
      if (sourceHasInputWithSameId) {
        throw new Error(`Edge source port "${edge.sourcePortId}" on node "${sourceNode.id}" is an input port. Edge source must bind an output port.`)
      }
      throw new Error(`Edge source port "${edge.sourcePortId}" not found in source node "${sourceNode.id}" outputs.`)
    }

    const targetHasInput = targetNode.inputs.type === 'Some' && targetNode.inputs.value.some((item) => item.id === edge.targetPortId)
    if (!targetHasInput) {
      const targetHasOutputWithSameId = targetNode.outputs.type === 'Some' && targetNode.outputs.value.some((item) => item.id === edge.targetPortId)
      if (targetHasOutputWithSameId) {
        throw new Error(`Edge target port "${edge.targetPortId}" on node "${targetNode.id}" is an output port. Edge target must bind an input port.`)
      }
      throw new Error(`Edge target port "${edge.targetPortId}" not found in target node "${targetNode.id}" inputs.`)
    }
  }
}

function validateAcyclicBoundary(flowRaw: FlowRaw): void {
  const adjacency = new Map<string, Set<string>>()
  for (const node of flowRaw.nodes) {
    adjacency.set(node.id, new Set<string>())
  }
  for (const edge of flowRaw.edges) {
    const next = adjacency.get(edge.sourceNodeId)
    if (!next) continue
    next.add(edge.targetNodeId)
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const stack: string[] = []

  const dfs = (nodeId: string): void => {
    if (visiting.has(nodeId)) {
      const cycleStartIndex = stack.indexOf(nodeId)
      const cyclePath = cycleStartIndex >= 0 ? stack.slice(cycleStartIndex).concat(nodeId) : [nodeId, nodeId]
      throw new Error(`Flow "${flowRaw.name}" contains a cycle: ${cyclePath.join(' -> ')}.`)
    }
    if (visited.has(nodeId)) return

    visiting.add(nodeId)
    stack.push(nodeId)
    const nextNodes = adjacency.get(nodeId)
    if (nextNodes) {
      for (const nextNodeId of nextNodes) {
        dfs(nextNodeId)
      }
    }
    stack.pop()
    visiting.delete(nodeId)
    visited.add(nodeId)
  }

  for (const node of flowRaw.nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id)
    }
  }
}

function validateFlowBoundary(flowRaw: FlowRaw): void {
  validateNodePortAndExecutorBoundary(flowRaw)
  validateEdgeBoundary(flowRaw)
  validateAcyclicBoundary(flowRaw)
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

  const flowRawForBoundaryCheck = buildFlowRaw()
  validateFlowBoundary(flowRawForBoundaryCheck)

  const buildFlow = (): Flow => {
    let running = false
    const flow: Flow = {
      getName: function (): string {
        return validatedConfig.name
      },
      getRunningStatus: function (): boolean {
        return running
      },
      fork: function (): Flow {
        const forkedConfig = regenerateFlowConfigIds(validatedConfig)
        return compileFlow(forkedConfig, registry)
      },
      run: async function (signal: AbortController): Promise<FlowRaw> {
        const flowRaw = buildFlowRaw()
        const startNode = findStartNode(flowRaw)
        running = true
        await executeNode(startNode, flowRaw.nodes, flowRaw.edges, signal)
        running = false
        return flowRaw
      },
    }
    return flow
  }

  return buildFlow()
}

export { compileFlow }
