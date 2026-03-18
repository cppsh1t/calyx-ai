import type { Edge, Flow, Node, NodeEmitter, NodePort, RunFlowOptions, RunFlowResult } from '@/types'
import { FlowObjectSchema } from '@/types/core/flow.ts'
import { isEmpty } from 'radash'

import { None, Some } from '@/utils/structure.ts'
import { EdgeBuilder, NodeBuilder } from './node.ts'
import type { NodeRegistry } from './registry.ts'

const createFlow = (obj: unknown, registry: NodeRegistry, emitter?: NodeEmitter): Flow => {
  const parseResult = FlowObjectSchema.safeParse(obj)
  if (!parseResult.success) {
    throw new Error(`Invalid Flow object: ${parseResult.error.message}`)
  }

  const flowObj = parseResult.data
  const nodes = (flowObj.nodes ?? []).map((nodeObj) => NodeBuilder.fromObject(nodeObj, registry).build())
  const edges = (flowObj.edges ?? []).map((edgeObj) => EdgeBuilder.fromObject(edgeObj).build())

  return {
    name: flowObj.name,
    nodes: isEmpty(nodes) ? None : Some(nodes),
    edges: isEmpty(edges) ? None : Some(edges),
    emitter,
  }
}

const cloneNodePort = (port: NodePort): NodePort => ({
  id: port.id,
  name: port.name,
  schema: port.schema,
  direction: port.direction,
  description: port.description,
  value: port.value,
})

const cloneNode = (node: Node): Node => ({
  id: node.id,
  name: node.name,
  description: node.description,
  position: { x: node.position.x, y: node.position.y },
  symbol: node.symbol,
  group: node.group,
  parameters: node.parameters.type === 'Some' ? Some(node.parameters.value.map((param) => ({ ...param }))) : None,
  inputs: node.inputs.type === 'Some' ? Some(node.inputs.value.map(cloneNodePort)) : None,
  outputs: node.outputs.type === 'Some' ? Some(node.outputs.value.map(cloneNodePort)) : None,
  executor: node.executor,
})

const runFlow = async (flow: Flow, startSymbol: string, options?: RunFlowOptions): Promise<RunFlowResult> => {
  const runtimeAbort = new AbortController()

  const onAbort = (): void => {
    runtimeAbort.abort(options?.signal?.reason)
  }

  options?.signal?.addEventListener('abort', onAbort, { once: true })

  if (options?.signal?.aborted) {
    runtimeAbort.abort(options.signal.reason)
  }

  try {
    const nodes = flow.nodes.type === 'Some' ? flow.nodes.value.map(cloneNode) : []
    const edges = flow.edges.type === 'Some' ? flow.edges.value : []

    const nodeById = new Map<string, Node>(nodes.map((node) => [node.id, node]))
    const edgeByFrom = new Map<string, Edge[]>()

    for (const edge of edges) {
      const key = `${edge.from.nodeId}:${edge.from.portId}`
      const list = edgeByFrom.get(key)
      if (list) {
        list.push(edge)
      } else {
        edgeByFrom.set(key, [edge])
      }
    }

    const startNodes = nodes.filter((node) => node.symbol.type === 'Some' && node.symbol.value === startSymbol)
    if (startNodes.length === 0) {
      throw new Error(`Start node not found for symbol: "${startSymbol}"`)
    }
    if (startNodes.length > 1) {
      throw new Error(`Multiple start nodes found for symbol: "${startSymbol}"`)
    }
    const startNode = startNodes[0]
    if (!startNode) {
      throw new Error(`Start node not found for symbol: "${startSymbol}"`)
    }

    if (runtimeAbort.signal.aborted) {
      return { status: 'aborted' }
    }

    const queue: string[] = []
    const running = new Set<Promise<void>>()
    let executionError: Error | null = null

    const normalizeError = (error: unknown): Error => {
      if (error instanceof Error) {
        return error
      }

      return new Error(String(error))
    }

    const emitFromExecutor: NodeEmitter = (event): void => {
      if (runtimeAbort.signal.aborted) {
        return
      }

      flow.emitter?.(event)
    }

    const enqueueNode = (nodeId: string): void => {
      queue.push(nodeId)
    }

    const activateInput = (nodeId: string, portId: string, value: unknown): void => {
      if (runtimeAbort.signal.aborted) {
        return
      }

      const node = nodeById.get(nodeId)
      if (!node) {
        throw new Error(`Destination node not found: "${nodeId}"`)
      }

      if (node.inputs.type !== 'Some') {
        throw new Error(`Node "${node.name}" has no input ports`)
      }

      const port = node.inputs.value.find((input) => input.id === portId)
      if (!port) {
        throw new Error(`Input port "${portId}" not found on node "${node.name}"`)
      }

      const parsed = port.schema.safeParse(value)
      if (!parsed.success) {
        throw new Error(`Invalid input value for node "${node.name}" port "${port.name}": ${parsed.error.message}`)
      }

      port.value = Some(parsed.data)
      enqueueNode(node.id)
      schedule()
    }

    const executeNode = async (node: Node): Promise<void> => {
      if (runtimeAbort.signal.aborted) {
        return
      }

      if (node.outputs.type === 'Some') {
        for (const output of node.outputs.value) {
          output.value = None
        }
      }

      try {
        await node.executor.execute({
          node,
          parameters: node.parameters,
          inputs: node.inputs,
          outputs: node.outputs,
          abort: runtimeAbort,
          emitter: emitFromExecutor,
        })
      } catch (error) {
        if (runtimeAbort.signal.aborted) {
          return
        }

        throw error
      }

      if (node.outputs.type !== 'Some') {
        return
      }

      for (const output of node.outputs.value) {
        if (output.value.type !== 'Some') {
          continue
        }

        const outputParsed = output.schema.safeParse(output.value.value)
        if (!outputParsed.success) {
          throw new Error(`Invalid output value for node "${node.name}" port "${output.name}": ${outputParsed.error.message}`)
        }

        const key = `${node.id}:${output.id}`
        const outbound = edgeByFrom.get(key) ?? []

        for (const edge of outbound) {
          activateInput(edge.to.nodeId, edge.to.portId, outputParsed.data)
        }
      }
    }

    const runNode = (node: Node): Promise<void> =>
      executeNode(node).catch((error) => {
        if (runtimeAbort.signal.aborted) {
          return
        }

        executionError = normalizeError(error)
        runtimeAbort.abort(executionError)
      })

    function schedule(): void {
      if (runtimeAbort.signal.aborted || executionError) {
        return
      }

      while (queue.length > 0 && !runtimeAbort.signal.aborted && !executionError) {
        const nodeId = queue.shift()
        if (!nodeId) {
          continue
        }

        const node = nodeById.get(nodeId)
        if (!node) {
          executionError = new Error(`Node not found for queued id: "${nodeId}"`)
          runtimeAbort.abort(executionError)
          return
        }

        let task: Promise<void>
        task = runNode(node).finally(() => {
          running.delete(task)
          schedule()
        })
        running.add(task)
      }
    }

    enqueueNode(startNode.id)
    schedule()

    while ((queue.length > 0 || running.size > 0) && !executionError && !runtimeAbort.signal.aborted) {
      if (running.size === 0) {
        schedule()
        if (running.size === 0) {
          break
        }
      }

      await Promise.race(Array.from(running))
    }

    if (executionError) {
      throw executionError
    }

    return { status: runtimeAbort.signal.aborted ? 'aborted' : 'completed' }
  } finally {
    options?.signal?.removeEventListener('abort', onAbort)
  }
}

export { createFlow, runFlow }
export type { Flow, RunFlowOptions, RunFlowResult }
