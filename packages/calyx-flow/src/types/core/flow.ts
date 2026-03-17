import {z} from 'zod'
import type { Edge, Node } from './node'
import type { Option } from '../structure'

type Flow = {
  name: string
  nodes: Option<Node>
  edges: Option<Edge>
}