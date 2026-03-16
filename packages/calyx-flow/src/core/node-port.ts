import type { INode, INodePort, Schema } from '@/types'
import { v4 as uuid } from 'uuid'

type NodePortPolicy = 'required' | 'optional'

type NodePortCreateOptions = {
  name: string
  schema: Schema
  description?: string
  policy: NodePortPolicy
}

class NodePort implements INodePort {
  private readonly id: string
  private readonly name: string
  private readonly schema: Schema
  private readonly description: string
  private readonly policy: NodePortPolicy
  private owner: INode | null

  public constructor(name: string, schema: Schema, description: string, policy: NodePortPolicy) {
    this.id = uuid()
    this.name = name
    this.schema = schema
    this.description = description
    this.policy = policy
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

  public getPolicy(): NodePortPolicy {
    return this.policy
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
    return new NodePort(options.name, options.schema, options.description ?? '', options.policy)
  }

  public static builder(name: string, schema: Schema, policy: NodePortPolicy): NodePortBuilder {
    return new NodePortBuilder(name, schema, policy)
  }
}

class NodePortBuilder {
  private options: NodePortCreateOptions

  public constructor(name: string, schema: Schema, policy: NodePortPolicy) {
    this.options = {
      name,
      schema,
      policy,
      description: '',
    }
  }

  public withDescription(description: string): NodePortBuilder {
    this.options.description = description
    return this
  }

  public withPolicy(policy: NodePortPolicy): NodePortBuilder {
    this.options.policy = policy
    return this
  }

  public build(): NodePort {
    return NodePortFactory.create(this.options)
  }
}

export { NodePortBuilder, NodePortFactory, type NodePortCreateOptions, type NodePortPolicy }
