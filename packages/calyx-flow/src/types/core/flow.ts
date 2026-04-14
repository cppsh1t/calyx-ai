import { z } from 'zod'
import { EdgeSchema, NodeDataSchema, type Edge, type NodeData, type NodeInstance } from './node'

type FlowInstance<T> = {
  id: string
  name: string
  nodes: NodeInstance[]
  edges: Edge[]
  meta: T
}

const FlowConfigSchema = <T extends z.ZodType>(metaSchema: T) =>
  z.object({
    name: z.string(),
    nodes: z.array(NodeDataSchema),
    edges: z.array(EdgeSchema),
    meta: metaSchema,
  })

type FlowConfig<T> = {
  name: string
  nodes: NodeData[]
  edges: Edge[]
  meta: T
}

type Flow<T> = {
  getName: () => string
  getRunningStatus: () => boolean
  run: (abort?: AbortController) => Promise<FlowInstance<T>>
}

export { FlowConfigSchema }
export type { Flow, FlowConfig, FlowInstance }
