import {
  validateNodeDataNamesAreUnique,
  validateNodeDefinitionNamesAreUnique,
  validateNodePortIdsAreUnique,
  validateOutputRequiredInputsAreUnique,
  validateOutputRequiredInputsReferenceExistingInputs,
  validateRequiredInputsDoNotExistWithoutInputs,
} from '@/core/node-validation.ts'
import type {
  NodeInputPortDefinition,
  NodeInputPortInstance,
  NodeInstance,
  NodeOutputPortDefinition,
  NodeOutputPortInstance,
  NodeParameterDefinition,
  NodeParameterInstance,
  Option,
  TypeSome,
} from '@/types'
import { NodeDataSchema, NodeInputPortDataSchema, NodeOutputPortDataSchema, NodeParameterDataSchema } from '@/types/core/node'
import { None, Some } from '@/utils/structure'
import type { NodeRegistry } from './registry'

function buildNodeParameterInstance(definition: NodeParameterDefinition, data: unknown): NodeParameterInstance {
  const parsedData = NodeParameterDataSchema.safeParse(data)
  if (!parsedData.success) {
    throw new Error(`Invalid parameter data for parameter "${definition.name}": ${parsedData.error.message}`)
  }

  const nodeParameterData = parsedData.data

  const paramVal = nodeParameterData.value
  let valueParseAfter: unknown | undefined = undefined
  if (paramVal.type === 'Some') {
    const valueParseResult = definition.schema.safeParse(paramVal.value)
    if (!valueParseResult.success) {
      throw new Error(`Invalid parameter value for parameter "${definition.name}": ${valueParseResult.error.message}`)
    }
    valueParseAfter = valueParseResult.data
  }

  if (definition.name !== nodeParameterData.name) {
    throw new Error(`Parameter name mismatch: expected "${definition.name}", got "${nodeParameterData.name}"`)
  }

  return {
    name: definition.name,
    description: definition.description,
    schema: definition.schema,
    value: paramVal.type === 'Some' ? Some(valueParseAfter) : None,
  }
}

function buildNodeInputPortInstance(definition: NodeInputPortDefinition, data: unknown): NodeInputPortInstance {
  const parsedData = NodeInputPortDataSchema.safeParse(data)
  if (!parsedData.success) {
    throw new Error(`Invalid input port data for input port "${definition.name}": ${parsedData.error.message}`)
  }
  const nodeInputPortData = parsedData.data

  if (definition.name !== nodeInputPortData.name) {
    throw new Error(`Input port name mismatch: expected "${definition.name}", got "${nodeInputPortData.name}"`)
  }

  let instance: NodeInputPortInstance = {
    id: nodeInputPortData.id,
    name: definition.name,
    description: definition.description,
    schema: definition.schema,
    used: false,
    value: None,
  }

  return instance
}

function buildNodeOutputPortInstance(definition: NodeOutputPortDefinition, data: unknown): NodeOutputPortInstance {
  const parsedData = NodeOutputPortDataSchema.safeParse(data)
  if (!parsedData.success) {
    throw new Error(`Invalid output port data for output port "${definition.name}": ${parsedData.error.message}`)
  }
  const nodeOutputPortData = parsedData.data

  if (definition.name !== nodeOutputPortData.name) {
    throw new Error(`Output port name mismatch: expected "${definition.name}", got "${nodeOutputPortData.name}"`)
  }

  let instance: NodeOutputPortInstance = {
    id: nodeOutputPortData.id,
    name: definition.name,
    description: definition.description,
    schema: definition.schema,
    used: false,
    value: None,
    requiredInputs: definition.requiredInputs,
    executor: definition.executor,
  }

  return instance
}

function buildNodeInstance(registry: NodeRegistry, data: unknown): NodeInstance {
  const nodeInstanceDataParseResult = NodeDataSchema.safeParse(data)
  if (!nodeInstanceDataParseResult.success) {
    throw new Error(`Invalid node instance data: ${nodeInstanceDataParseResult.error.message}`)
  }
  const nodeInstanceData = nodeInstanceDataParseResult.data

  const key = nodeInstanceData.key
  const registryEntry = registry.get(key)
  if (!registryEntry) {
    throw new Error(`Node definition not found for key: ${key}`)
  }

  const definition = registryEntry.definition
  if (definition.name !== nodeInstanceData.name) {
    throw new Error(`Node name mismatch: expected "${definition.name}", got "${nodeInstanceData.name}"`)
  }

  validateNodeDefinitionNamesAreUnique(definition)
  validateNodeDataNamesAreUnique(definition.name, nodeInstanceData)

  let parameters: Option<NodeParameterInstance[]> = None
  if (definition.parameters.type === 'Some') {
    parameters = Some([]) as TypeSome<NodeParameterInstance[]>
    if (nodeInstanceData.parameters.type === 'None') {
      throw new Error(`Node parameters data is missing for node "${definition.name}"`)
    }
    for (const paramDef of definition.parameters.value) {
      const paramData = nodeInstanceData.parameters.value.find((p) => p.name === paramDef.name)
      if (!paramData) {
        throw new Error(`Parameter data not found for parameter "${paramDef.name}" in node "${definition.name}"`)
      }
      parameters.value.push(buildNodeParameterInstance(paramDef, paramData))
    }
  }

  let inputs: Option<NodeInputPortInstance[]> = None
  if (definition.inputs.type === 'Some') {
    inputs = Some([]) as TypeSome<NodeInputPortInstance[]>
    if (nodeInstanceData.inputs.type === 'None') {
      throw new Error(`Node inputs data is missing for node "${definition.name}"`)
    }
    for (const inputDef of definition.inputs.value) {
      const inputData = nodeInstanceData.inputs.value.find((i) => i.name === inputDef.name)
      if (!inputData) {
        throw new Error(`Input port data not found for input port "${inputDef.name}" in node "${definition.name}"`)
      }
      inputs.value.push(buildNodeInputPortInstance(inputDef, inputData))
    }
  }

  let outputs: Option<NodeOutputPortInstance[]> = None
  if (definition.outputs.type === 'Some') {
    outputs = Some([]) as TypeSome<NodeOutputPortInstance[]>
    if (nodeInstanceData.outputs.type === 'None') {
      throw new Error(`Node outputs data is missing for node "${definition.name}"`)
    }
    for (const outputDef of definition.outputs.value) {
      const outputData = nodeInstanceData.outputs.value.find((o) => o.name === outputDef.name)
      if (!outputData) {
        throw new Error(`Output port data not found for output port "${outputDef.name}" in node "${definition.name}"`)
      }
      outputs.value.push(buildNodeOutputPortInstance(outputDef, outputData))
    }
  }

  validateNodePortIdsAreUnique(definition.name, inputs, outputs)
  validateOutputRequiredInputsAreUnique(definition.name, outputs)
  validateRequiredInputsDoNotExistWithoutInputs(definition.name, inputs, outputs)
  validateOutputRequiredInputsReferenceExistingInputs(definition.name, inputs, outputs)

  return {
    id: nodeInstanceData.id,
    name: definition.name,
    position: nodeInstanceData.position,
    description: definition.description,
    type: definition.type,
    docs: definition.docs,
    group: definition.group,
    parameters,
    inputs,
    outputs,
    runningTimes: 0,
  }
}

export { buildNodeInputPortInstance, buildNodeInstance, buildNodeOutputPortInstance, buildNodeParameterInstance }
