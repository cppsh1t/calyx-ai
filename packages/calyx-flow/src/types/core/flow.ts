import { EdgeSchema, NodeDataSchema, type Edge, type NodeInstance } from "./node"
import { z } from "zod"

type FlowInstance = {
  id: string
  name: string
  nodes: NodeInstance[]
  edges: Edge[]
}

const FlowConfigSchema = z.object({
  name: z.string(),
  nodes: z.array(NodeDataSchema),
  edges: z.array(EdgeSchema),
})

type FlowConfig = z.infer<typeof FlowConfigSchema>

type Flow = {
  getName: () => string
  getRunningStatus: () => boolean
  run: (abort?: AbortController) => Promise<FlowInstance>
}

export type {  Flow, FlowConfig, FlowInstance }
export { FlowConfigSchema }