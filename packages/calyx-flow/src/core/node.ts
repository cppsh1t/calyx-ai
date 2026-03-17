import type { Edge, Node, NodeExecutor, NodeParameter, NodePort, Position } from '@/types'
import type { Option } from '@/types/structure'
import { None, Some } from '@/utils/structure'
import { isEmpty } from 'radash'
import { v4 as uuid } from 'uuid'
import type { ZodType } from 'zod'
import z from 'zod'

// NodePort Builder
class NodePortBuilder {
  private id: string = uuid()
  private name: string = ''
  private schema: ZodType = z.any()
  private direction: 'input' | 'output' = 'input'
  private description: string = ''
  private value: Option<any> = None

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
    this.value = Some(value)
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
    this.value = Some(value)
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
      output: isEmpty(this.outputs) ? None : Some(this.outputs),
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

// Factory functions for convenience
function createNodePort(): NodePortBuilder {
  return new NodePortBuilder()
}

function createNodeParameter(): NodeParameterBuilder {
  return new NodeParameterBuilder()
}

function createNode(): NodeBuilder {
  return new NodeBuilder()
}

function createEdge(): EdgeBuilder {
  return new EdgeBuilder()
}

export { createEdge, createNode, createNodeParameter, createNodePort, None, Some }

export type { EdgeBuilder, NodeBuilder, NodeParameterBuilder, NodePortBuilder }
