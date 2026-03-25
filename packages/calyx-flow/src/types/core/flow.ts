import { EdgeSchema, NodeDataSchema, type Edge, type Node } from "./node"
import {z} from 'zod'

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
  edges: z.array(EdgeSchema)
})

type FlowConfig = z.infer<typeof FlowConfigSchema>

export type { Flow, FlowRaw, FlowConfig}
export { FlowConfigSchema }