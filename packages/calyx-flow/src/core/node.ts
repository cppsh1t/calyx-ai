import type { Edge, Node, NodeExecutor, NodeParameter, NodePort, Position } from '@/types'
import { EdgeSchema, NodeSchema } from '@/types/core/node.ts'
import type { Option } from '@/types/structure'
import { None, Some } from '@/utils/structure'
import { isEmpty } from 'radash'
import { v4 as uuid } from 'uuid'
import type { ZodType } from 'zod'
import z from 'zod'
import { NodeRegistry } from './registry.ts'

// NodePort Builder
class NodePortBuilder {
  private id: string = uuid()
  private name: string = ''
  private schema: ZodType = z.any()
  private direction: 'input' | 'output' = 'input'
  private description: string = ''
  private value: Option<any> = None

  static from(port: NodePort): NodePortBuilder {
    const builder = new NodePortBuilder()
    builder.id = port.id
    builder.name = port.name
    builder.schema = port.schema
    builder.direction = port.direction
    builder.description = port.description
    builder.value = port.value
    return builder
  }

  withId(id: string): this {
    this.id = id
    return this
  }

  withName(name: string): this {
    this.name = name
    return this
  }

  withSchema<T>(schema: ZodType<T>): this {
    this.schema = schema
    return this
  }

  withDirection(direction: 'input' | 'output'): this {
    this.direction = direction
    return this
  }

  asInput(): this {
    this.direction = 'input'
    return this
  }

  asOutput(): this {
    this.direction = 'output'
    return this
  }

  withDescription(description: string): this {
    this.description = description
    return this
  }

  withValue<T>(value: T): this {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new Error(`Invalid value for port "${this.name}": ${result.error.message}`)
    }
    this.value = Some(result.data)
    return this
  }

  build(): NodePort {
    return {
      id: this.id,
      name: this.name,
      schema: this.schema,
      direction: this.direction,
      description: this.description,
      value: this.value,
    }
  }
}

// NodeParameter Builder
class NodeParameterBuilder {
  private name: string = ''
  private schema: ZodType = z.any()
  private description: string = ''
  private value: Option<any> = None

  static from(param: NodeParameter): NodeParameterBuilder {
    const builder = new NodeParameterBuilder()
    builder.name = param.name
    builder.schema = param.schema
    builder.description = param.description
    builder.value = param.value
    return builder
  }

  withName(name: string): this {
    this.name = name
    return this
  }

  withSchema<T>(schema: ZodType<T>): this {
    this.schema = schema
    return this
  }

  withDescription(description: string): this {
    this.description = description
    return this
  }

  withValue<T>(value: T): this {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new Error(`Invalid value for parameter "${this.name}": ${result.error.message}`)
    }
    this.value = Some(result.data)
    return this
  }

  build(): NodeParameter {
    return {
      name: this.name,
      schema: this.schema,
      description: this.description,
      value: this.value,
    }
  }
}

// Node Builder
class NodeBuilder {
  private id: string = uuid()
  private name: string = ''
  private description: string = ''
  private position: Position = { x: 0, y: 0 }
  private symbol: Option<string> = None
  private group: Option<string> = None
  private parameters: NodeParameter[] = []
  private inputs: NodePort[] = []
  private outputs: NodePort[] = []
  private executor: NodeExecutor | null = null

  static from(node: Node): NodeBuilder {
    const builder = new NodeBuilder()
    builder.id = node.id
    builder.name = node.name
    builder.description = node.description
    builder.position = node.position
    builder.symbol = node.symbol
    builder.group = node.group
    builder.parameters = node.parameters.type === 'Some' ? node.parameters.value : []
    builder.inputs = node.inputs.type === 'Some' ? node.inputs.value : []
    builder.outputs = node.outputs.type === 'Some' ? node.outputs.value : []
    builder.executor = node.executor
    return builder
  }

  /**
   * Create a NodeBuilder from an object that conforms to NodeSchema.
   * Validates the object against NodeSchema, retrieves the NodeDefinition from registry,
   * validates parameters/inputs/outputs against their schema definitions from NodeDefinition,
   * and returns a configured NodeBuilder.
   *
   * NodeSchema only contains data (id/name + value), schema comes from NodeDefinition.
   */
  static fromObject(obj: unknown, registry: NodeRegistry): NodeBuilder {
    // Step 1: Validate object against NodeSchema
    const parseResult = NodeSchema.safeParse(obj)
    if (!parseResult.success) {
      throw new Error(`Invalid Node object: ${parseResult.error.message}`)
    }
    const validatedObj = parseResult.data

    // Step 2: Retrieve NodeDefinition from registry using key
    const registryEntry = registry.get(validatedObj.key)
    if (!registryEntry) {
      throw new Error(`NodeDefinition not found for key: "${validatedObj.key}". Make sure to register it first.`)
    }
    const definition = registryEntry.definition

    // Step 3: Build Node using definition as base
    const builder = new NodeBuilder()
    if (validatedObj.id) {
      builder.id = validatedObj.id
    }
    builder.name = validatedObj.name
    builder.description = validatedObj.description
    builder.position = validatedObj.position
    builder.symbol = validatedObj.symbol !== undefined ? Some(validatedObj.symbol) : definition.symbol
    builder.executor = definition.executor

    // Handle group from definition (since NodeSchema doesn't have it)
    builder.group = definition.group.type === 'Some' ? definition.group : None

    // Step 4: Build parameters from definition and apply validated object overrides
    const definitionParams = definition.parameters.type === 'Some' ? definition.parameters.value : []
    const parameterOverrides = validatedObj.parameters ?? []

    for (const override of parameterOverrides) {
      if (!definitionParams.find((param) => param.name === override.name)) {
        throw new Error(`Parameter "${override.name}" not defined in NodeDefinition for key "${validatedObj.key}"`)
      }
    }

    for (const defParam of definitionParams) {
      const paramData = parameterOverrides.find((param) => param.name === defParam.name)
      let validatedValue = defParam.value

      if (paramData && paramData.value !== undefined && paramData.value !== null) {
        const valueResult = defParam.schema.safeParse(paramData.value)
        if (!valueResult.success) {
          throw new Error(`Invalid value for parameter "${paramData.name}" in node "${validatedObj.name}": ${valueResult.error.message}`)
        }
        validatedValue = Some(valueResult.data)
      }

      builder.parameters.push({
        name: defParam.name,
        schema: defParam.schema,
        description: defParam.description,
        value: validatedValue,
      })
    }

    // Step 5: Build input ports from definition and apply validated object overrides
    const definitionInputs = definition.inputs.type === 'Some' ? definition.inputs.value : []
    const inputOverrides = validatedObj.inputs ?? []

    for (const override of inputOverrides) {
      if (!definitionInputs.find((input) => input.id === override.id)) {
        throw new Error(`Input "${override.id}" not defined in NodeDefinition for key "${validatedObj.key}"`)
      }
    }

    for (const defInput of definitionInputs) {
      const inputData = inputOverrides.find((input) => input.id === defInput.id)
      let validatedValue = defInput.value

      if (inputData && inputData.value !== undefined && inputData.value !== null) {
        const valueResult = defInput.schema.safeParse(inputData.value)
        if (!valueResult.success) {
          throw new Error(`Invalid value for input "${defInput.name}" in node "${validatedObj.name}": ${valueResult.error.message}`)
        }
        validatedValue = Some(valueResult.data)
      }

      builder.inputs.push({
        id: defInput.id,
        name: defInput.name,
        schema: defInput.schema,
        direction: defInput.direction,
        description: defInput.description,
        value: validatedValue,
      })
    }

    // Step 6: Build output ports from definition and apply validated object overrides
    const definitionOutputs = definition.outputs.type === 'Some' ? definition.outputs.value : []
    const outputOverrides = validatedObj.outputs ?? []

    for (const override of outputOverrides) {
      if (!definitionOutputs.find((output) => output.id === override.id)) {
        throw new Error(`Output "${override.id}" not defined in NodeDefinition for key "${validatedObj.key}"`)
      }
    }

    for (const defOutput of definitionOutputs) {
      const outputData = outputOverrides.find((output) => output.id === defOutput.id)
      let validatedValue = defOutput.value

      if (outputData && outputData.value !== undefined && outputData.value !== null) {
        const valueResult = defOutput.schema.safeParse(outputData.value)
        if (!valueResult.success) {
          throw new Error(`Invalid value for output "${defOutput.name}" in node "${validatedObj.name}": ${valueResult.error.message}`)
        }
        validatedValue = Some(valueResult.data)
      }

      builder.outputs.push({
        id: defOutput.id,
        name: defOutput.name,
        schema: defOutput.schema,
        direction: defOutput.direction,
        description: defOutput.description,
        value: validatedValue,
      })
    }

    return builder
  }

  withId(id: string): this {
    this.id = id
    return this
  }

  withName(name: string): this {
    this.name = name
    return this
  }

  withDescription(description: string): this {
    this.description = description
    return this
  }

  atPosition(x: number, y: number): this {
    this.position = { x, y }
    return this
  }

  withPosition(position: Position): this {
    this.position = position
    return this
  }

  withSymbol(symbol: string): this {
    this.symbol = Some(symbol)
    return this
  }

  withGroup(group: string): this {
    this.group = Some(group)
    return this
  }

  addParameter(param: NodeParameter): this {
    this.parameters.push(param)
    return this
  }

  addParameterBuilder(builder: NodeParameterBuilder): this {
    this.parameters.push(builder.build())
    return this
  }

  withParameters(params: NodeParameter[]): this {
    this.parameters = params
    return this
  }

  addInput(port: NodePort): this {
    this.inputs.push(port)
    return this
  }

  addInputBuilder(builder: NodePortBuilder): this {
    this.inputs.push(builder.build())
    return this
  }

  addOutput(port: NodePort): this {
    this.outputs.push(port)
    return this
  }

  addOutputBuilder(builder: NodePortBuilder): this {
    this.outputs.push(builder.build())
    return this
  }

  withExecutor(executor: NodeExecutor): this {
    this.executor = executor
    return this
  }

  execute(fn: (ctx: any) => Promise<void>): this {
    this.executor = { execute: fn }
    return this
  }

  build(): Node {
    if (!this.executor) {
      throw new Error('Node must have an executor')
    }
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      position: this.position,
      symbol: this.symbol,
      group: this.group,
      parameters: isEmpty(this.parameters) ? None : Some(this.parameters),
      inputs: isEmpty(this.inputs) ? None : Some(this.inputs),
      outputs: isEmpty(this.outputs) ? None : Some(this.outputs),
      executor: this.executor,
    }
  }
}

// Edge Builder
class EdgeBuilder {
  private fromNodeId: string = ''
  private fromPortId: string = ''
  private toNodeId: string = ''
  private toPortId: string = ''

  static from(edge: Edge): EdgeBuilder {
    const builder = new EdgeBuilder()
    builder.fromNodeId = edge.from.nodeId
    builder.fromPortId = edge.from.portId
    builder.toNodeId = edge.to.nodeId
    builder.toPortId = edge.to.portId
    return builder
  }

  static fromObject(obj: unknown): EdgeBuilder {
    const parseResult = EdgeSchema.safeParse(obj)
    if (!parseResult.success) {
      throw new Error(`Invalid Edge object: ${parseResult.error.message}`)
    }

    const edge = parseResult.data
    return EdgeBuilder.from(edge)
  }

  from(nodeId: string, portId: string): this {
    this.fromNodeId = nodeId
    this.fromPortId = portId
    return this
  }

  fromNode(nodeId: string): this {
    this.fromNodeId = nodeId
    return this
  }

  fromPort(portId: string): this {
    this.fromPortId = portId
    return this
  }

  to(nodeId: string, portId: string): this {
    this.toNodeId = nodeId
    this.toPortId = portId
    return this
  }

  toNode(nodeId: string): this {
    this.toNodeId = nodeId
    return this
  }

  toPort(portId: string): this {
    this.toPortId = portId
    return this
  }

  build(): Edge {
    if (!this.fromNodeId || !this.fromPortId) {
      throw new Error('Edge must have from node and port')
    }
    if (!this.toNodeId || !this.toPortId) {
      throw new Error('Edge must have to node and port')
    }

    return {
      from: { nodeId: this.fromNodeId, portId: this.fromPortId },
      to: { nodeId: this.toNodeId, portId: this.toPortId },
    }
  }
}

export { EdgeBuilder, NodeBuilder, NodeParameterBuilder, NodePortBuilder }
