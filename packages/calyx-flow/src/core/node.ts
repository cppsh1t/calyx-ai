import { NodePortFactory, type NodePortCreateOptions } from '@/core/node-port.ts'
import type { INode, INodePort, NodeParameter, Position } from '@/types'
import { isEmpty } from 'radash'
import { v4 as uuid } from 'uuid'
import type { ZodType } from 'zod'
import z from 'zod'

type NodeCreateOptions = {
  type: string
  name: string
  description?: string
  position?: Position
  parameters?: NodeParameter[]
  inputs?: INodePort[]
  outputs?: INodePort[]
}

class Node implements INode {
  private id: string
  private type: string
  private name: string
  private description: string
  private position: Position
  protected parameters: NodeParameter[]
  protected inputs: INodePort[]
  protected outputs: INodePort[]

  protected inputValMap: Map<string, any> = new Map()
  protected outputValMap: Map<string, any> = new Map()
  protected argumentsMap: Map<string, any> = new Map()

  protected constructor(
    type: string,
    name: string,
    description: string,
    position: Position,
    parameters?: NodeParameter[],
    inputs?: INodePort[],
    outputs?: INodePort[]
  ) {
    this.id = uuid()
    this.type = type
    this.name = name
    this.description = description
    this.position = position
    this.parameters = parameters || []
    this.inputs = inputs || []
    this.outputs = outputs || []

    this.inputs.forEach(item => item.setOwner(this))
    this.outputs.forEach(item => item.setOwner(this))
  }

  public static create(options: NodeCreateOptions): Node {
    const description = options.description ?? ''
    const position = options.position ?? { x: 0, y: 0 }

    return new Node(options.type, options.name, description, position, options.parameters, options.inputs, options.outputs)
  }

  public static builder(type: string, name: string): NodeBuilder {
    return new NodeBuilder(type, name)
  }

  public getId(): string {
    return this.id
  }

  public getType(): string {
    return this.type
  }

  public getName(): string {
    return this.name
  }

  public getDescription(): string {
    return this.description
  }

  public getPosition(): Position {
    return this.position
  }

  public setPosition(position: Position): void {
    this.position = position
  }

  public setarguments(name: string, value: any): void {
    this.argumentsMap.set(name, value)
  }

  public getParameters() {
    return this.parameters
  }
  public getInputs() {
    return this.inputs
  }
  public getOutputs() {
    return this.outputs
  }

  public setInputValue(id: string, value: any) {
    const port = this.inputs.find((item) => item.getId() === id) as INodePort
    if (isEmpty(port)) return //TODO: return error in future
    let schema: ZodType
    const originSchema = port.getSchema()
    if (originSchema.type === 'json') {
      schema = z.fromJSONSchema(JSON.parse(originSchema.data))
    } else {
      schema = originSchema.data
    }

    const parseRes = schema.safeParse(value)
    if (!parseRes.success) return //TODO: return error in future
    this.inputValMap.set(id, parseRes.data)
    this.afterInput()
  }

  public setOutputValue(id: string, value: any) {
    const port = this.outputs.find((item) => item.getId() === id) as INodePort
    if (isEmpty(port)) return //TODO: return error in future
    let schema: ZodType
    const originSchema = port.getSchema()
    if (originSchema.type === 'json') {
      schema = z.fromJSONSchema(JSON.parse(originSchema.data))
    } else {
      schema = originSchema.data
    }

    const parseRes = schema.safeParse(value)
    if (!parseRes.success) return //TODO: return error in future
    this.outputValMap.set(id, parseRes.data)
    this.afterOutput()
  }

  protected afterInput() {}

  protected afterOutput() {}
}

class NodeBuilder {
  private options: NodeCreateOptions

  public constructor(type: string, name: string) {
    this.options = {
      type,
      name,
      description: '',
      position: { x: 0, y: 0 },
    }
  }

  public withDescription(description: string): NodeBuilder {
    this.options.description = description
    return this
  }

  public withPosition(position: Position): NodeBuilder {
    this.options.position = position
    return this
  }

  public witharguments(parameters: NodeParameter[]): NodeBuilder {
    this.options.parameters = parameters
    return this
  }

  public withInputs(inputs: INodePort[]): NodeBuilder {
    this.options.inputs = inputs
    return this
  }

  public withInputPorts(inputPorts: ReadonlyArray<NodePortCreateOptions>): NodeBuilder {
    this.options.inputs = inputPorts.map((inputPort) => NodePortFactory.create(inputPort))
    return this
  }

  public withOutputs(outputs: INodePort[]): NodeBuilder {
    this.options.outputs = outputs
    return this
  }

  public withOutputPorts(outputPorts: ReadonlyArray<NodePortCreateOptions>): NodeBuilder {
    this.options.outputs = outputPorts.map((outputPort) => NodePortFactory.create(outputPort))
    return this
  }

  public build(): Node {
    return Node.create(this.options)
  }
}

export { Node, NodeBuilder, type NodeCreateOptions }
