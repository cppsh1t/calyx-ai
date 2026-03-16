import { ZodType } from 'zod'

type Schema =
  | {
      type: 'zod'
      data: ZodType
    }
  | {
      type: 'json'
      data: string
    }

type Position = {
  x: number
  y: number
}

type NodeParameter = {
  name: string
  schema: Schema
  description: string
}

interface INodePort {
  getId: () => string
  getName: () => string
  getSchema: () => Schema
  getDescription: () => string
  getPolicy: () => 'required' | 'optional'
  setOwner: (node: INode) => void
  getOwner: () => INode
}

interface INode {
  getId: () => string
  getType: () => string
  getName: () => string
  getDescription: () => string
  getPosition: () => Position
  setPosition: (position: Position) => void
  getParameters: () => NodeParameter[]
  setarguments: (name: string, value: any) => void
  getInputs: () => INodePort[]
  getOutputs: () => INodePort[]
  setInputValue: (id: string, value: any) => void
  setOutputValue: (id: string, value: any) => void
  hasRequiredPortsReady: (portType: 'input' | 'output') => boolean
}

/**
 * can't change source or target, you need create a new one
 */
interface IEdge {
  getId: () => string
  getSource: () => string | undefined // source port id
  getTarget: () => string | undefined // target port id
}

export type { IEdge, INode, INodePort, NodeParameter, Position, Schema }
