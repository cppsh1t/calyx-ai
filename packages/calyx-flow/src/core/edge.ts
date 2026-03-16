import type { IEdge, INode, NodeParameter, NodePort, Position } from '@/types'
import { v4 as uuid } from 'uuid'

class Edge implements IEdge {
  private source: string
  private target: string
  private id: string

  public constructor(source: string, target: string) {
    this.id = uuid()
    this.source = source
    this.target = target
  }

  public getId() {
    return this.id
  }
  public getSource() {
    return this.source
  }
  public getTarget() {
    return this.target
  }
  
}

export { Edge }