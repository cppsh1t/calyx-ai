import type { Node } from "@/core"
import type { Edge } from "@/core"

interface IFlow {
  getId: () => string
  getName: () => string
  run: () => void
  getNodes: () => Node[]
  getEdges: () => Edge[]
}

type FlowConfig = {
  id: string
  name: string
  
}