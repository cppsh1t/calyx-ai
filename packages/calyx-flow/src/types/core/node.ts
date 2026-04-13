import { ZodType, z } from 'zod'
import { optionSchema, type Option } from '../structure'

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

type Position = z.infer<typeof PositionSchema>

const NodeRegistryKeySchema = z.templateLiteral([z.string().min(1), '/', z.string().min(1)])

type NodeExecuteContext = { currentNode: NodeInstance, inputs: Option<NodeInputPortInstance[]>; parameters: Option<NodeParameterInstance[]>; signal: AbortSignal }
type NodeExecuteResult<T = any> = {
  continue: boolean
  data: T 
}
type NodeExecutor<T = any> = (ctx: NodeExecuteContext) => Promise<NodeExecuteResult<T>>

const NodeInputPortInstanceSchema = z.object({
  id: z.string().meta({
    description: '[Runtime] Unique ID identifying this input port instance',
  }),

  name: z.string().meta({
    description: '[Definition] Port name; used as the key to bind and assemble instance data with its corresponding definition',
  }),

  description: z.string().meta({
    description: '[Definition] Description of the input port',
  }),

  schema: z.custom<ZodType>().meta({
    description: '[Definition/PostCompile] Schema definition of the input port value',
  }),

  value: optionSchema(z.any()).meta({
    description: '[Runtime] Current value of the input port instance (optional)',
  }),

  used: z.boolean().meta({
    description: '[Runtime] Whether this input port instance has been used/consumed in execution',
  }),
})

const NodeInputPortDefinitionSchema = NodeInputPortInstanceSchema.pick({ name: true, description: true, schema: true }).extend({
  postCompile: optionSchema(z.custom<NodeInputPortPostCompile>((val) => val === undefined || typeof val === 'function')).meta({
    description: '[Definition] Post-compile hook for transforming input port instance',
  }),
})
const NodeInputPortDataSchema = NodeInputPortInstanceSchema.pick({ id: true, name: true })

type NodeInputPortInstance = z.infer<typeof NodeInputPortInstanceSchema>
type NodeInputPortDefinition = z.infer<typeof NodeInputPortDefinitionSchema>
type NodeInputPortData = z.infer<typeof NodeInputPortDataSchema>
type NodeInputPortPostCompile = (origin: NodeInputPortInstance) => NodeInputPortInstance

const NodeOutputPortInstanceSchema = z.object({
  id: z.string().meta({
    description: '[Runtime] Unique ID identifying this output port instance',
  }),

  name: z.string().meta({
    description: '[Definition] Port name; used as the key to bind and assemble instance data with its corresponding definition',
  }),

  description: z.string().meta({
    description: '[Definition] Description of the output port',
  }),

  schema: z.custom<ZodType>().meta({
    description: '[Definition/PostCompile] Schema definition of the output port value',
  }),

  value: optionSchema(z.any()).meta({
    description: '[Runtime] Current value of the output port instance (optional)',
  }),

  used: z.boolean().meta({
    description: '[Runtime] Whether this output port instance has been used/consumed in execution',
  }),

  requiredInputs: optionSchema(z.array(z.string())).meta({
    description: '[Definition/PostCompile] List of required input port names that must be provided for this output port to execute',
  }),

  executor: z.custom<NodeExecutor>().meta({
    description: '[Definition] Executor function that defines the execution logic for this output port',
  }),
})

const NodeOutputPortDefinitionSchema = NodeOutputPortInstanceSchema.pick({
  name: true,
  description: true,
  schema: true,
  requiredInputs: true,
  executor: true,
}).extend({
  postCompile: optionSchema(z.custom<NodeOutputPortPostCompile>((val) => val === undefined || typeof val === 'function')).meta({
    description: '[Definition] Post-compile hook for transforming output port instance',
  }),
})
const NodeOutputPortDataSchema = NodeOutputPortInstanceSchema.pick({ id: true, name: true })

type NodeOutputPortInstance = z.infer<typeof NodeOutputPortInstanceSchema>
type NodeOutputPortDefinition = z.infer<typeof NodeOutputPortDefinitionSchema>
type NodeOutputPortData = z.infer<typeof NodeOutputPortDataSchema>
type NodeOutputPortPostCompile = (origin: NodeOutputPortInstance) => NodeOutputPortInstance

const NodeParameterInstanceSchema = z.object({
  name: z.string().meta({
    description: '[Definition] Parameter name; used as the key to bind and assemble instance data with its corresponding definition',
  }),

  description: z.string().meta({
    description: '[Definition] Description of the parameter',
  }),

  schema: z.custom<ZodType>().meta({
    description: '[Definition/PostCompile] Schema definition of the parameter value',
  }),

  value: optionSchema(z.any()).meta({
    description: '[Runtime] Current value of the parameter instance (optional)',
  }),
})

const NodeParameterDefinitionSchema = NodeParameterInstanceSchema.pick({ name: true, description: true, schema: true })
const NodeParameterDataSchema = NodeParameterInstanceSchema.pick({ name: true, value: true })

type NodeParameterInstance = z.infer<typeof NodeParameterInstanceSchema>
type NodeParameterDefinition = z.infer<typeof NodeParameterDefinitionSchema>
type NodeParameterData = z.infer<typeof NodeParameterDataSchema>

const NodeInstanceSchema = z.object({
  id: z.string().meta({
    description: '[Runtime] Unique ID identifying this node instance',
  }),
  name: z.string().meta({
    description: '[Definition] Name of the node instance',
  }),
  position: PositionSchema.meta({
    description: '[Runtime] Position of the node instance in the editor/canvas',
  }),
  description: z.string().meta({
    description: '[Definition] Description of the node instance',
  }),
  type: z.array(z.string()).meta({
    description:
      '[Definition] List of type identifiers for this node instance; used for processing in renderer and other potential use cases, but not for declaring usage',
  }),
  docs: z.string().meta({
    description: '[Definition] Documentation for the node instance',
  }),
  group: z.string().meta({
    description: '[Definition] Group to which this node instance belongs for rendering purposes',
  }),
  parameters: optionSchema(z.array(NodeParameterInstanceSchema)).meta({
    description: '[Runtime] List of parameter instances for this node instance (optional)',
  }),
  inputs: optionSchema(z.array(NodeInputPortInstanceSchema)).meta({
    description: '[Runtime] List of input port instances for this node instance (optional)',
  }),
  outputs: optionSchema(z.array(NodeOutputPortInstanceSchema)).meta({
    description: '[Runtime] List of output port instances for this node instance (optional)',
  }),
  runningTimes: z.number().meta({
    description: '[Runtime] Number of times this node instance has been executed; used for tracking execution and debugging',
  }),
})

const NodeDefinitionSchema = NodeInstanceSchema.pick({ name: true, description: true, type: true, docs: true, group: true }).extend({
  parameters: optionSchema(z.array(NodeParameterDefinitionSchema)).meta({
    description: '[Definition] List of parameter definitions for this node instance (optional)',
  }),
  inputs: optionSchema(z.array(NodeInputPortDefinitionSchema)).meta({
    description: '[Definition] List of input port definitions for this node instance (optional)',
  }),
  outputs: optionSchema(z.array(NodeOutputPortDefinitionSchema)).meta({
    description: '[Definition] List of output port definitions for this node instance (optional)',
  }),
})

const NodeDataSchema = NodeInstanceSchema.pick({ id: true, name: true, position: true }).extend({
  key: NodeRegistryKeySchema.meta({
    description: '[Runtime] Registry key of the node instance, used to look up its corresponding definition',
  }),
  parameters: optionSchema(z.array(NodeParameterDataSchema)).meta({
    description: '[Runtime] List of parameter data for this node instance (optional)',
  }),
  inputs: optionSchema(z.array(NodeInputPortDataSchema)).meta({
    description: '[Runtime] List of input port data for this node instance (optional)',
  }),
  outputs: optionSchema(z.array(NodeOutputPortDataSchema)).meta({
    description: '[Runtime] List of output port data for this node instance (optional)',
  }),
})

type NodeInstance = z.infer<typeof NodeInstanceSchema>
type NodeDefinition = z.infer<typeof NodeDefinitionSchema>
type NodeData = z.infer<typeof NodeDataSchema>

const EdgeSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  sourcePortId: z.string(),
  targetPortId: z.string()
})

type Edge = z.infer<typeof EdgeSchema>

export type {
  Edge,
  NodeData,
  NodeDefinition,
  NodeExecuteContext,
  NodeExecuteResult,
  NodeExecutor,
  NodeInputPortData,
  NodeInputPortDefinition,
  NodeInputPortInstance,
  NodeInstance,
  NodeOutputPortData,
  NodeOutputPortDefinition,
  NodeOutputPortInstance,
  NodeParameterData,
  NodeParameterDefinition,
  NodeParameterInstance,
  Position,
}

export {
  NodeInputPortDataSchema,
  NodeInputPortDefinitionSchema,
  NodeInputPortInstanceSchema,
  NodeOutputPortDataSchema,
  NodeOutputPortDefinitionSchema,
  NodeOutputPortInstanceSchema,
  NodeParameterDataSchema,
  NodeParameterDefinitionSchema,
  NodeParameterInstanceSchema,
  NodeRegistryKeySchema,
  NodeDataSchema,
  NodeInstanceSchema,
  NodeDefinitionSchema,
  PositionSchema,
  EdgeSchema
}
