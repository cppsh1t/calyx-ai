import type { Node, NodeInputPort, NodeInputPortData, NodeOutputPort, NodeOutputPortData, NodeParameter, NodeParameterData } from '@/types/core/node.ts'
import {
  NodeDataSchema,
  NodeInputPortDataSchema,
  NodeInputPortSchema,
  NodeOutputPortDataSchema,
  NodeOutputPortSchema,
  NodeParameterDataSchema,
  NodeParameterSchema,
} from '@/types/core/node.ts'
import type { Option } from '@/types/structure'
import { None, Some } from '@/utils/structure'
import z from 'zod'
import type { NodeRegistry } from './registry.ts'

function createNodeParameterBuilder(data?: Partial<NodeParameterData>) {
  let state: Partial<NodeParameterData> = {
    name: data?.name,
    description: data?.description,
    schema: data?.schema,
    value: data?.value,
  }

  return {
    setName(name: NodeParameterData['name']) {
      state.name = name
      return this
    },
    setDescription(description: NodeParameterData['description']) {
      state.description = description
      return this
    },
    setSchema(schema: NodeParameterData['schema']) {
      state.schema = schema
      return this
    },
    setValue(value: NodeParameterData['value']) {
      state.value = value
      return this
    },
    from(obj: object) {
      const result = NodeParameterDataSchema.safeParse(obj)
      if (!result.success) {
        throw new Error(`Invalid NodeParameterData: ${result.error.message}`)
      }
      state = result.data
      return this
    },
    build(): NodeParameter {
      const result = NodeParameterDataSchema.safeParse(state)
      if (!result.success) {
        throw new Error(`Invalid NodeParameterData: ${result.error.message}`)
      }

      const validatedData = result.data
      const zodSchema = z.fromJSONSchema(validatedData.schema)

      let optionValue: Option<unknown>
      if (validatedData.value === undefined || validatedData.value === null) {
        optionValue = None
      } else {
        const valueResult = zodSchema.safeParse(validatedData.value)
        if (!valueResult.success) {
          throw new Error(`Invalid NodeParameter value for "${validatedData.name}": ${valueResult.error.message}`)
        }
        optionValue = Some(valueResult.data)
      }

      const combine = {
        ...validatedData,
        schema: zodSchema,
        value: optionValue,
      }
      const combineResult = NodeParameterSchema(z.unknown()).safeParse(combine)
      if (!combineResult.success) {
        throw new Error(`Invalid NodeParameter: ${combineResult.error.message}`)
      }
      return combineResult.data
    },
  }
}

function createNodeInputPortBuilder(data?: Partial<NodeInputPortData>) {
  let state: Partial<NodeInputPortData> = {
    id: data?.id,
    name: data?.name,
    description: data?.description,
    schema: data?.schema,
    value: data?.value,
  }

  return {
    setId(id: NodeInputPortData['id']) {
      state.id = id
      return this
    },
    setName(name: NodeInputPortData['name']) {
      state.name = name
      return this
    },
    setDescription(description: NodeInputPortData['description']) {
      state.description = description
      return this
    },
    setSchema(schema: NodeInputPortData['schema']) {
      state.schema = schema
      return this
    },
    setValue(value: NodeInputPortData['value']) {
      state.value = value
      return this
    },
    from(obj: object) {
      const result = NodeInputPortDataSchema.safeParse(obj)
      if (!result.success) {
        throw new Error(`Invalid NodeInputPortData: ${result.error.message}`)
      }
      state = result.data
      return this
    },
    build(): NodeInputPort {
      const result = NodeInputPortDataSchema.safeParse(state)
      if (!result.success) {
        throw new Error(`Invalid NodeInputPortData: ${result.error.message}`)
      }

      const validatedData = result.data
      const zodSchema = z.fromJSONSchema(validatedData.schema)

      let optionValue: Option<unknown>
      if (validatedData.value === undefined || validatedData.value === null) {
        optionValue = None
      } else {
        const valueResult = zodSchema.safeParse(validatedData.value)
        if (!valueResult.success) {
          throw new Error(`Invalid NodeInputPort value for "${validatedData.name}": ${valueResult.error.message}`)
        }
        optionValue = Some(valueResult.data)
      }

      const combine = {
        ...validatedData,
        schema: zodSchema,
        value: optionValue,
      }
      const combineResult = NodeInputPortSchema(z.unknown()).safeParse(combine)
      if (!combineResult.success) {
        throw new Error(`Invalid NodeInputPort: ${combineResult.error.message}`)
      }
      return combineResult.data
    },
  }
}

function createNodeOutputPortBuilder(data?: Partial<NodeOutputPortData>) {
  let state: Partial<NodeOutputPortData> = {
    id: data?.id,
    name: data?.name,
    description: data?.description,
    schema: data?.schema,
    value: data?.value,
    requiredInputs: data?.requiredInputs,
  }

  return {
    setId(id: NodeOutputPortData['id']) {
      state.id = id
      return this
    },
    setName(name: NodeOutputPortData['name']) {
      state.name = name
      return this
    },
    setDescription(description: NodeOutputPortData['description']) {
      state.description = description
      return this
    },
    setSchema(schema: NodeOutputPortData['schema']) {
      state.schema = schema
      return this
    },
    setValue(value: NodeOutputPortData['value']) {
      state.value = value
      return this
    },
    setRequiredInputs(requiredInputs: NodeOutputPortData['requiredInputs']) {
      state.requiredInputs = requiredInputs
      return this
    },
    from(obj: object) {
      const result = NodeOutputPortDataSchema.safeParse(obj)
      if (!result.success) {
        throw new Error(`Invalid NodeOutputPortData: ${result.error.message}`)
      }
      state = result.data
      return this
    },
    build(): NodeOutputPort {
      const result = NodeOutputPortDataSchema.safeParse(state)
      if (!result.success) {
        throw new Error(`Invalid NodeOutputPortData: ${result.error.message}`)
      }

      const validatedData = result.data
      const zodSchema = z.fromJSONSchema(validatedData.schema)

      let optionValue: Option<unknown>
      if (validatedData.value === undefined || validatedData.value === null) {
        optionValue = None
      } else {
        const valueResult = zodSchema.safeParse(validatedData.value)
        if (!valueResult.success) {
          throw new Error(`Invalid NodeOutputPort value for "${validatedData.name}": ${valueResult.error.message}`)
        }
        optionValue = Some(valueResult.data)
      }

      let optionRequiredInputs: Option<string[]>
      if (validatedData.requiredInputs === undefined || validatedData.requiredInputs === null) {
        optionRequiredInputs = None
      } else {
        optionRequiredInputs = Some(validatedData.requiredInputs)
      }

      const combine = {
        ...validatedData,
        schema: zodSchema,
        value: optionValue,
        requiredInputs: optionRequiredInputs,
      }
      const combineResult = NodeOutputPortSchema(z.unknown()).safeParse(combine)
      if (!combineResult.success) {
        throw new Error(`Invalid NodeOutputPort: ${combineResult.error.message}`)
      }
      return combineResult.data
    },
  }
}

type NodeData = {
  id: string
  key: `${string}/${string}`
  name: string
  parameters?: NodeParameterData[]
  inputs?: NodeInputPortData[]
  outputs?: NodeOutputPortData[]
}

function createNodeBuilder(data?: Partial<NodeData>) {
  let state: Partial<NodeData> = {
    id: data?.id,
    key: data?.key,
    name: data?.name,
    parameters: data?.parameters,
    inputs: data?.inputs,
    outputs: data?.outputs,
  }
  let registry: NodeRegistry | null = null

  return {
    setId(id: NodeData['id']) {
      state.id = id
      return this
    },
    setKey(key: NodeData['key']) {
      state.key = key
      return this
    },
    setName(name: NodeData['name']) {
      state.name = name
      return this
    },
    setParameters(parameters: NodeData['parameters']) {
      state.parameters = parameters
      return this
    },
    setInputs(inputs: NodeData['inputs']) {
      state.inputs = inputs
      return this
    },
    setOutputs(outputs: NodeData['outputs']) {
      state.outputs = outputs
      return this
    },
    setRegistry(nodeRegistry: NodeRegistry) {
      registry = nodeRegistry
      return this
    },
    from(obj: object) {
      const result = NodeDataSchema.safeParse(obj)
      if (!result.success) {
        throw new Error(`Invalid NodeData: ${result.error.message}`)
      }
      const data = result.data
      state = {
        id: data.id,
        key: data.key,
        name: data.name,
        parameters: data.parameters,
        inputs: data.inputs,
        outputs: data.outputs,
      }
      return this
    },
    build(): Node {
      if (!registry) {
        throw new Error('NodeRegistry is required to build a Node')
      }
      if (!state.key) {
        throw new Error('Node key is required to build a Node')
      }

      const entry = registry.get(state.key)
      if (!entry) {
        throw new Error(`Node definition not found for key: "${state.key}"`)
      }

      const definition = entry.definition

      if (!state.id) {
        throw new Error('Node id is required to build a Node')
      }

      const nodeName = state.name ?? definition.name

      // Build parameters
      let optionParameters: Option<Array<NodeParameter>>
      if (state.parameters && state.parameters.length > 0) {
        // If NodeData has parameters, use them to build NodeParameter instances
        const params = state.parameters.map((paramData) => createNodeParameterBuilder(paramData).build())
        optionParameters = Some(params) // For now, take the first one
      } else {
        optionParameters = None
      }

      // Build inputs
      let optionInputs: Option<Array<NodeInputPort>>
      if (state.inputs && state.inputs.length > 0) {
        const inputs = state.inputs.map((inputData) => createNodeInputPortBuilder(inputData).build())
        optionInputs = Some(inputs) // For now, take the first one
      } else {
        optionInputs = None
      }

      // Build outputs
      let optionOutputs: Option<Array<NodeOutputPort>>
      if (state.outputs && state.outputs.length > 0) {
        const outputs = state.outputs.map((outputData) => createNodeOutputPortBuilder(outputData).build())
        optionOutputs = Some(outputs) // For now, take the first one
      } else {
        optionOutputs = None
      }

      const node: Node = {
        id: state.id,
        name: nodeName,
        description: definition.description,
        docs: definition.docs,
        state: 'wait',
        group: definition.group,
        parameters: optionParameters,
        inputs: optionInputs,
        outputs: optionOutputs,
        executors: definition.executors.map((executor) => ({
          ...executor,
          state: 'wait',
        })),
      }

      return node
    },
  }
}

export { createNodeBuilder, createNodeInputPortBuilder, createNodeOutputPortBuilder, createNodeParameterBuilder }
