import type { INode, NodeParameter, NodePort, Position } from '@/types'
import { v4 as uuid } from 'uuid'

class Node implements INode {
  private id: string
  private type: string
  private name: string
  private description: string
  private position: Position
  public readonly arguements?: NodeParameter[] | undefined
  public readonly inputs?: NodePort[] | undefined
  public readonly outputs?: NodePort[] | undefined

  private arguementsMap: Map<string, any> = new Map()

  private constructor(
    type: string,
    name: string,
    description: string,
    position: Position,
    arguements?: NodeParameter[],
    inputs?: NodePort[],
    outputs?: NodePort[]
  ) {
    this.id = uuid()
    this.type = type
    this.name = name
    this.description = description
    this.position = position
    this.arguements = arguements
    this.inputs = inputs
    this.outputs = outputs
  }

  public getId(): string {
    return this.id
  }

  public getType(): string {
    return this.type
  }

  public getName(): string {
    return this.name
  }

  public getDescription(): string {
    return this.description
  }

  public getPosition(): Position {
    return this.position
  }

  public setPosition(position: Position): void {
    this.position = position
  }

  public setArguements(name: string, value: any): void {
    this.arguementsMap.set(name, value)
  }
}

export { Node }
