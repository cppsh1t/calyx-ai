import { ZodType } from 'zod'
import type { Option } from '../structure'

type Position = {
  x: number
  y: number
}

type ExecutionContext = {}


type NodeExecutor = {
  execute(ctx: ExecutionContext): Promise<void>
}

type NodePort = {
  id: string
  name: string
  schema: ZodType
  direction: 'input' | 'output'
  description: string
  value: Option<any>
}

type NodeParameter = {
  name: string
  schema: ZodType
  description: string
  value: Option<any>
}

type Node = {
  id: string
  name: string
  position: Position
  symbol: Option<string>
  group: Option<string>
  parameters: Option<NodeParameter[]>
  inputs: Option<NodePort[]>
  output: Option<NodePort[]>
}


export type { ExecutionContext, NodeExecutor, NodePort, NodeParameter, Node, Position }