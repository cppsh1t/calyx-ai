import { ZodType, z } from 'zod'
import type { Option } from '../structure'

type Position = {
  x: number
  y: number
}

type NodeExecuteContext = {}
type NodeExecutor<T = any> = {
  outputName: string //bind a nodeoutput port
  func: (ctx: NodeExecuteContext) => Promise<T>
}

//NodeInputPort Intancese type
type NodeInputPort<T = any> = {
  id: string
  name: string
  description: string
  schema: ZodType
  value: Option<T>
}

const NodeInputPortDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  schema: z.record(z.string(), z.any()), //json schema
  value: z.unknown().optional(),
})

type NodeInputPortData = z.infer<typeof NodeInputPortDataSchema>

type NodeOutputPort<T = any> = {
  id: string
  name: string
  description: string
  schema: ZodType
  value: Option<T>
  requiredInputs: Option<string[]> // required input names
}

const NodeOutputPortDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  schema: z.record(z.string(), z.any()), //json schema
  value: z.unknown().optional(),
  requiredInputs: z.array(z.string()).optional(),
})

type NodeOutputPortData = z.infer<typeof NodeOutputPortDataSchema>

type NodeParameter<T = any> = {
  name: string
  description: string
  schema: ZodType
  value: Option<T>
}

const NodeParameterSchema = z.object({
  name: z.string(),
  description: z.string(),
  schema: z.custom<ZodType>((v) => v instanceof ZodType),
  value: z.unknown().optional()
})

const NodeParameterDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  schema: z.record(z.string(), z.any()), //json schema
  value: z.unknown().optional(),
})

type NodeParameterData = z.infer<typeof NodeParameterDataSchema>

type Node = {
  id: string
  name: string
  description: string
  docs: string //markdown
  parameters: Option<NodeParameter>
  inputs: Option<NodeInputPort>
  outputs: Option<NodeOutputPort>
  executors: Array<NodeExecutor>
}

type NodeDefinition = Omit<Node, 'id'>

const NodeDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  parameters: z.array(NodeParameterDataSchema).optional(),
  inputs: z.array(NodeInputPortDataSchema).optional(),
  outputs: z.array(NodeOutputPortDataSchema).optional(),
})

export { NodeDataSchema, NodeInputPortDataSchema, NodeOutputPortDataSchema, NodeParameterDataSchema, NodeParameterSchema }
export type {
  Node,
  NodeDefinition,
  NodeExecuteContext,
  NodeExecutor,
  NodeInputPort,
  NodeInputPortData,
  NodeOutputPort,
  NodeOutputPortData,
  NodeParameter,
  NodeParameterData,
  Position,
}
