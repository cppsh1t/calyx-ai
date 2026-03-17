import { ZodType, z } from 'zod'
import type { Option } from '../structure'

type Position = {
  x: number
  y: number
}

type ExecutionContext = {
  parameters: Option<NodeParameter[]>
  inputs: Option<NodePort[]>
  outputs: Option<NodePort[]>
  abort: AbortController
}

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
  outputs: Option<NodePort[]>
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

const NodePortSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  direction: z.enum(['input', 'output']),
  schema: z.string(),
  value: z.any(),
})

const NodeParameterSchema = z.object({
  name: z.string(),
  description: z.string(),
  schema: z.string(),
  value: z.any(),
})

// NodeDefinition validation schema
const NodeDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  symbol: OptionSchema(z.string()),
  group: OptionSchema(z.string()),
  parameters: OptionSchema(z.array(NodeParameterSchema)),
  inputs: OptionSchema(z.array(NodePortSchema)),
  outputs: OptionSchema(z.array(NodePortSchema)),
  executor: z.object({ execute: z.function() }),
})

// Node registry key type: namespace/group
type NodeRegistryKey = `${string}/${string}`

// NodePortData schema - only id and value for input/output data
const NodePortDataSchema = z.object({
  id: z.string(),
  value: z.any(),
})

// NodeParameterData schema - only name and value for parameter data
const NodeParameterDataSchema = z.object({
  name: z.string(),
  value: z.any(),
})

// Node schema for object-to-node conversion (matches NodeRegistry key format)
// Contains only data, schema validation uses NodeDefinition from registry
const NodeSchema = z.object({
  key: z.string().refine((val) => val.includes('/'), {
    message: 'Key must be in format: namespace/group',
  }) as z.ZodType<NodeRegistryKey>,
  name: z.string(),
  description: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  symbol: z.string().optional(),
  parameters: z.array(NodeParameterDataSchema).optional(),
  inputs: z.array(NodePortDataSchema).optional(),
  outputs: z.array(NodePortDataSchema).optional(),
})

export type { NodeRegistryKey }

export { NodeDefinitionSchema, NodeParameterSchema, NodePortSchema, NodeSchema }
