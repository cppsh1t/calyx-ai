import { NodePortFactory, type NodePortCreateOptions } from '@/core/node-port.ts'
import type { INode, NodeParameter, NodePort, Position } from '@/types'
import { v4 as uuid } from 'uuid'

type NodeCreateOptions = {
  type: string
  name: string
  description?: string
  position?: Position
  parameters?: NodeParameter[]
  inputs?: NodePort[]
  outputs?: NodePort[]
}

class Node implements INode {
  private id: string
  private type: string
  private name: string
  private description: string
  private position: Position
  public readonly parameters?: NodeParameter[] | undefined
  public readonly inputs?: NodePort[] | undefined
  public readonly outputs?: NodePort[] | undefined

  private argumentsMap: Map<string, any> = new Map()

  private constructor(
    type: string,
    name: string,
    description: string,
    position: Position,
    parameters?: NodeParameter[],
    inputs?: NodePort[],
    outputs?: NodePort[]
  ) {
    this.id = uuid()
    this.type = type
    this.name = name
    this.description = description
    this.position = position
    this.parameters = parameters
    this.inputs = inputs
    this.outputs = outputs
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

  public withInputs(inputs: NodePort[]): NodeBuilder {
    this.options.inputs = inputs
    return this
  }

  public withInputPorts(inputPorts: ReadonlyArray<NodePortCreateOptions>): NodeBuilder {
    this.options.inputs = inputPorts.map((inputPort) => NodePortFactory.create(inputPort))
    return this
  }

  public withOutputs(outputs: NodePort[]): NodeBuilder {
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
