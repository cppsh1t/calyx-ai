import { ZodType, z } from 'zod'
import type { Option } from '../structure'

type Position = {
  x: number
  y: number
}

type ExecutionContext = {}

type NodeExecutor = {
  execute(ctx: ExecutionContext): Promise<void>
}

type NodePort = {
  id: string
  name: string
  schema: ZodType
  direction: 'input' | 'output'
  description: string
  value: Option<any>
}

type NodeParameter = {
  name: string
  schema: ZodType
  description: string
  value: Option<any>
}

type Node = {
  id: string
  name: string
  description: string
  position: Position
  symbol: Option<string>
  group: Option<string>
  parameters: Option<NodeParameter[]>
  inputs: Option<NodePort[]>
  output: Option<NodePort[]>
  executor: NodeExecutor
}

type NodeDefinition = Omit<Node, 'id'>

type Edge = {
  from: { nodeId: string; portId: string }
  to: { nodeId: string; portId: string }
}

export type { Edge, ExecutionContext, Node, NodeDefinition, NodeExecutor, NodeParameter, NodePort, Position }

// Option schema helper
const OptionSchema = <T>(valueSchema: z.ZodType<T>) =>
  z.union([z.object({ type: z.literal('Some'), value: valueSchema }), z.object({ type: z.literal('None') })])

// NodeDefinition validation schema
const NodeDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  symbol: OptionSchema(z.string()),
  group: OptionSchema(z.string()),
  parameters: OptionSchema(z.array(z.any())),
  inputs: OptionSchema(z.array(z.any())),
  output: OptionSchema(z.array(z.any())),
  executor: z.object({ execute: z.function() }),
})

export { NodeDefinitionSchema }
