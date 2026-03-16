import { Node, NodePortBuilder } from '@/core'
import type { Position } from '@/types'
import z from 'zod'

const startNodeOutput = new NodePortBuilder(
  'output',
  {
    type: 'zod',
    data: z.any(),
  },
  'required'
).build()

class StartNode extends Node {
  public constructor(position: Position) {
    super('start-node', 'StartNode', 'start of flow', position, [], [], [startNodeOutput])
  }
}

export { StartNode }
