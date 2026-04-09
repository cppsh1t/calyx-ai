import { ZodType, z } from 'zod'
import { optionSchema, type Option } from '../structure'

type Position = {
  x: number
  y: number
}

const NodeRegistryKeySchema = z.templateLiteral([z.string().min(1), '/', z.string().min(1)])

type NodeExecuteContext = {inputs: Option<NodeInputPort[]>, parameters: Option<NodeParameter[]>, abort: AbortController}
type NodeExecuteResult<T = any> = {
  continue: boolean
  data: T | null
}
type NodeExecutor<T = any> = {
  outputName: string //bind a nodeoutput port
  used: boolean 
  func: (ctx: NodeExecuteContext) => Promise<NodeExecuteResult<T>>
}

//NodeInputPort Intancese type
type NodeInputPort<T = any> = {
  id: string
  name: string
  description: string
  schema: ZodType
  value: Option<T>
}

const NodeInputPortSchema = <T extends ZodType>(valueSchema: T) =>
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    schema: z.custom<ZodType>((v) => v instanceof z.ZodType, { message: 'schema must be a Zod schema' }),
    value: optionSchema(valueSchema),
  })

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

const NodeOutputPortSchema = <T extends ZodType>(valueSchema: T) =>
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    schema: z.custom<ZodType>((v) => v instanceof z.ZodType, { message: 'schema must be a Zod schema' }),
    value: optionSchema(valueSchema),
    requiredInputs: optionSchema(z.array(z.string())),
  })

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

const NodeParameterSchema = <T extends ZodType>(valueSchema: T) =>
  z.object({
    name: z.string(),
    description: z.string(),
    schema: z.custom<ZodType>((v) => v instanceof z.ZodType, { message: 'schema must be a Zod schema' }),
    value: optionSchema(valueSchema),
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
  type: string[]
  docs: string //markdown
  runningTimes: number
  group: string
  parameters: Option<Array<NodeParameter>>
  inputs: Option<Array<NodeInputPort>>
  outputs: Option<Array<NodeOutputPort>>
  executors: Array<NodeExecutor>
}

type NodeDefinition = Omit<Node, 'id' | 'runningTimes'>

const NodeDataSchema = z.object({
  id: z.string(),
  key: NodeRegistryKeySchema,
  name: z.string(),
  parameters: z.array(NodeParameterDataSchema).optional(),
  inputs: z.array(NodeInputPortDataSchema).optional(),
  outputs: z.array(NodeOutputPortDataSchema).optional(),
})

type NodeData = z.infer<typeof NodeDataSchema>

const EdgeSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  sourcePortId: z.string(),
  targetPortId: z.string()
})

type Edge = z.infer<typeof EdgeSchema>

export {
  NodeDataSchema,
  NodeInputPortDataSchema,
  NodeInputPortSchema,
  NodeOutputPortDataSchema,
  NodeOutputPortSchema,
  NodeParameterDataSchema,
  NodeParameterSchema,
  NodeRegistryKeySchema,
  EdgeSchema
}
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
  NodeExecuteResult,
  Position,
  NodeData,
  Edge
}
