import type { INode, INodePort, Schema } from '@/types'
import { v4 as uuid } from 'uuid'

type NodePortCreateOptions = {
  name: string
  schema: Schema
  description?: string
}

class NodePort implements INodePort {
  private readonly id: string
  private readonly name: string
  private readonly schema: Schema
  private readonly description: string
  private owner: INode | null

  public constructor(name: string, schema: Schema, description: string) {
    this.id = uuid()
    this.name = name
    this.schema = schema
    this.description = description
    this.owner = null
  }

  public getId(): string {
    return this.id
  }

  public getName(): string {
    return this.name
  }

  public getSchema(): Schema {
    return this.schema
  }

  public getDescription(): string {
    return this.description
  }


  public setOwner(node: INode): void {
    this.owner = node
  }

  public getOwner(): INode {
    if (!this.owner) {
      throw new Error('NodePort owner is not set')
    }
    return this.owner
  }
}

class NodePortFactory {
  public static create(options: NodePortCreateOptions): NodePort {
    return new NodePort(options.name, options.schema, options.description ?? '')
  }

  public static builder(name: string, schema: Schema): NodePortBuilder {
    return new NodePortBuilder(name, schema)
  }
}

class NodePortBuilder {
  private options: NodePortCreateOptions

  public constructor(name: string, schema: Schema) {
    this.options = {
      name,
      schema,
      description: '',
    }
  }

  public withDescription(description: string): NodePortBuilder {
    this.options.description = description
    return this
  }


  public build(): NodePort {
    return NodePortFactory.create(this.options)
  }
}

export { NodePortBuilder, NodePortFactory, type NodePortCreateOptions,}
