import { z } from 'zod'
import type { Option } from '../structure'
import { EdgeSchema, NodeSchema, type Edge, type Node, type NodeEmitter } from './node.ts'

type Flow = {
  name: string
  nodes: Option<Node[]>
  edges: Option<Edge[]>
  emitter?: NodeEmitter
}

type RunFlowOptions = {
  signal?: AbortSignal
}

type RunFlowResult = {
  status: 'completed' | 'aborted'
}

const FlowObjectSchema = z.object({
  name: z.string(),
  nodes: z.array(NodeSchema).optional(),
  edges: z.array(EdgeSchema).optional(),
})

export { FlowObjectSchema }
export type { Flow, RunFlowOptions, RunFlowResult }
