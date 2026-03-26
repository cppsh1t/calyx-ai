import { z } from 'zod'
import { EdgeSchema, NodeDataSchema, type Edge, type Node } from './node'

type Flow = {
  getName: () => string
  getRunningStatus: () => boolean
  fork: () => Flow
  run: (signal: AbortController) => Promise<FlowRaw>
}

type FlowRaw = {
  name: string
  nodes: Node[]
  edges: Edge[]
}

const FlowConfigSchema = z.object({
  name: z.string(),
  nodes: z.array(NodeDataSchema),
  edges: z.array(EdgeSchema),
})

type FlowConfig = z.infer<typeof FlowConfigSchema>

type CompositeFlow = {
  name: string
  subflows: Record<string, FlowRaw>
  nodes: Node[]
  edges: Edge[]
}

const CompositeFlowConfigSchema = z.object({
  name: z.string(),
  subflows: z.record(z.string(), FlowConfigSchema),
  nodes: z.array(NodeDataSchema),
  edges: z.array(EdgeSchema),
})

type CompositeFlowConfig = z.infer<typeof CompositeFlowConfigSchema>

export { FlowConfigSchema, CompositeFlowConfigSchema }
export type { Flow, FlowConfig, FlowRaw, CompositeFlow, CompositeFlowConfig }
