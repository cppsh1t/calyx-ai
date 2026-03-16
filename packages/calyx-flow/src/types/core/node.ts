import { ZodType } from 'zod'

type Schema = {
  type: 'zod',
  data: ZodType
} | {
  type: 'json',
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

type NodePort = NodeParameter & {
  policy: 'required' | 'optional'// if port's policy is required, node need wait those props
  id: string
}

interface INode {
  getId: () => string
  getType: () => string
  getName: () => string
  getDescription: () => string
  getPosition: () => Position
  setPosition: (position: Position) => void
  readonly parameters?: NodeParameter[]
  setarguments: (name: string, value: any) => void
  readonly inputs?: NodePort[]
  readonly outputs?: NodePort[]
}

/**
 * can't change source or target, you need create a new one
 */
interface IEdge {
  getId: () => string
  getSource: ()=> string | undefined // source port id
  getTarget: () => string | undefined // target port id
}

export type { Schema, Position, NodeParameter, NodePort, INode, IEdge }