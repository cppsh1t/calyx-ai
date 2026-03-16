import type { NodePort, Schema } from '@/types'
import { v4 as uuid } from 'uuid'

type NodePortPolicy = NodePort['policy']

type NodePortCreateOptions = {
  name: string
  schema: Schema
  description?: string
  policy: NodePortPolicy
}

class NodePortFactory {
  public static create(options: NodePortCreateOptions): NodePort {
    return {
      id: uuid(),
      name: options.name,
      schema: options.schema,
      description: options.description ?? '',
      policy: options.policy,
    }
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
