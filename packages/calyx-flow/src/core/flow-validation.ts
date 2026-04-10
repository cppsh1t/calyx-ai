import type { Edge, NodeInputPortInstance, NodeInstance, NodeOutputPortInstance } from '@/types'
import type { ZodType } from 'zod'

function getOptionValues<T>(option: { type: 'Some'; value: T[] } | { type: 'None' }): T[] {
  return option.type === 'Some' ? option.value : []
}

function getDuplicateValues(values: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value)
      continue
    }

    seen.add(value)
  }

  return Array.from(duplicates)
}

function formatQuotedValues(values: string[]): string {
  return values.map((value) => `"${value}"`).join(', ')
}

function getNodeInputs(node: NodeInstance): NodeInputPortInstance[] {
  return getOptionValues(node.inputs)
}

function getNodeOutputs(node: NodeInstance): NodeOutputPortInstance[] {
  return getOptionValues(node.outputs)
}

function findNodeById(nodes: NodeInstance[], nodeId: string): NodeInstance | null {
  return nodes.find((node) => node.id === nodeId) ?? null
}

function findInputPortById(node: NodeInstance, portId: string): NodeInputPortInstance | null {
  return getNodeInputs(node).find((port) => port.id === portId) ?? null
}

function findOutputPortById(node: NodeInstance, portId: string): NodeOutputPortInstance | null {
  return getNodeOutputs(node).find((port) => port.id === portId) ?? null
}

function getPortDirectionWithinNode(node: NodeInstance, portId: string): 'input' | 'output' | 'missing' {
  if (findInputPortById(node, portId)) return 'input'
  if (findOutputPortById(node, portId)) return 'output'
  return 'missing'
}

function validateNodeIdsAreUnique(nodes: NodeInstance[]): void {
  const duplicateIds = getDuplicateValues(nodes.map((node) => node.id))
  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate node ids found in flow: ${formatQuotedValues(duplicateIds)}`)
  }
}

function validateEdgeNodesExist(nodes: NodeInstance[], edges: Edge[]): void {
  for (const edge of edges) {
    if (!findNodeById(nodes, edge.sourceNodeId)) {
      throw new Error(`Edge references missing source node "${edge.sourceNodeId}"`)
    }

    if (!findNodeById(nodes, edge.targetNodeId)) {
      throw new Error(`Edge references missing target node "${edge.targetNodeId}"`)
    }
  }
}

function validateEdgeSourcePortsBelongToSourceOutputs(nodes: NodeInstance[], edges: Edge[]): void {
  for (const edge of edges) {
    const sourceNode = findNodeById(nodes, edge.sourceNodeId)
    if (!sourceNode) continue

    const sourceOutput = findOutputPortById(sourceNode, edge.sourcePortId)
    if (sourceOutput) continue

    const direction = getPortDirectionWithinNode(sourceNode, edge.sourcePortId)
    if (direction === 'input') {
      throw new Error(
        `Edge source port "${edge.sourcePortId}" on node "${sourceNode.name}" (id: ${sourceNode.id}) is an input port; source ports must be outputs`
      )
    }

    throw new Error(`Edge references missing source output port "${edge.sourcePortId}" on node "${sourceNode.name}" (id: ${sourceNode.id})`)
  }
}

function validateEdgeTargetPortsBelongToTargetInputs(nodes: NodeInstance[], edges: Edge[]): void {
  for (const edge of edges) {
    const targetNode = findNodeById(nodes, edge.targetNodeId)
    if (!targetNode) continue

    const targetInput = findInputPortById(targetNode, edge.targetPortId)
    if (targetInput) continue

    const direction = getPortDirectionWithinNode(targetNode, edge.targetPortId)
    if (direction === 'output') {
      throw new Error(
        `Edge target port "${edge.targetPortId}" on node "${targetNode.name}" (id: ${targetNode.id}) is an output port; target ports must be inputs`
      )
    }

    throw new Error(`Edge references missing target input port "${edge.targetPortId}" on node "${targetNode.name}" (id: ${targetNode.id})`)
  }
}

function validateInputPortsHaveSingleIncomingEdge(nodes: NodeInstance[], edges: Edge[]): void {
  const edgesByTargetPort = new Map<string, Edge[]>()

  for (const edge of edges) {
    const existing = edgesByTargetPort.get(edge.targetPortId)
    if (existing) {
      existing.push(edge)
      continue
    }

    edgesByTargetPort.set(edge.targetPortId, [edge])
  }

  for (const [targetPortId, targetEdges] of edgesByTargetPort.entries()) {
    if (targetEdges.length <= 1) continue

    const targetNode = nodes.find((node) => findInputPortById(node, targetPortId))
    const targetInput = targetNode ? findInputPortById(targetNode, targetPortId) : null
    const nodeLabel = targetNode ? ` on node "${targetNode.name}" (id: ${targetNode.id})` : ''
    const inputLabel = targetInput ? `"${targetInput.name}"` : `"${targetPortId}"`
    throw new Error(`Target input port ${inputLabel} (id: ${targetPortId})${nodeLabel} is connected by multiple edges, but inputs are consume-once`)
  }
}

function validateAtLeastOneStartNode(nodes: NodeInstance[]): void {
  const startNodes = nodes.filter((node) => node.type.includes('start-node'))
  if (startNodes.length === 0) {
    throw new Error('Flow must contain at least one start node')
  }
}

function validateStartNodesHaveNoIncomingEdges(nodes: NodeInstance[], edges: Edge[]): void {
  const startNodeIds = new Set(nodes.filter((node) => node.type.includes('start-node')).map((node) => node.id))

  for (const edge of edges) {
    if (!startNodeIds.has(edge.targetNodeId)) continue
    throw new Error(`Start node "${edge.targetNodeId}" cannot have incoming edges`)
  }
}

function validateStartNodesHaveOutputs(nodes: NodeInstance[]): void {
  const startNodes = nodes.filter((node) => node.type.includes('start-node'))
  for (const startNode of startNodes) {
    if (getNodeOutputs(startNode).length > 0) continue
    throw new Error(`Start node "${startNode.name}" (id: ${startNode.id}) must declare at least one output port`)
  }
}

function validateNoSelfLoops(nodes: NodeInstance[], edges: Edge[]): void {
  for (const edge of edges) {
    if (edge.sourceNodeId !== edge.targetNodeId) continue
    const node = findNodeById(nodes, edge.sourceNodeId)
    const nodeLabel = node ? `"${node.name}" (id: ${node.id})` : `"${edge.sourceNodeId}"`
    throw new Error(`Self-loop detected on node ${nodeLabel}`)
  }
}

function isSchemaOptional(schema: ZodType): boolean {
  return schema.safeParse(undefined).success
}

function isSchemaNullable(schema: ZodType): boolean {
  return schema.safeParse(null).success
}

function getSchemaKind(schema: ZodType): string {
  return schema.constructor.name
}

function getObjectShape(schema: ZodType): Record<string, ZodType> | null {
  if (getSchemaKind(schema) !== 'ZodObject') return null
  const objectSchema = schema as ZodType & { shape?: Record<string, ZodType> }
  return objectSchema.shape ?? null
}

function getArrayElementSchema(schema: ZodType): ZodType | null {
  if (getSchemaKind(schema) !== 'ZodArray') return null
  const arraySchema = schema as ZodType & { element?: ZodType }
  return arraySchema.element ?? null
}

function getUnionOptions(schema: ZodType): ZodType[] {
  if (getSchemaKind(schema) !== 'ZodUnion') return []
  const unionSchema = schema as ZodType & { options?: ZodType[] }
  return unionSchema.options ?? []
}

function getTupleItems(schema: ZodType): ZodType[] {
  if (getSchemaKind(schema) !== 'ZodTuple') return []
  const tupleSchema = schema as ZodType & { items?: ZodType[] }
  return tupleSchema.items ?? []
}

function getLiteralValues(schema: ZodType): unknown[] {
  if (getSchemaKind(schema) !== 'ZodLiteral') return []
  const literalSchema = schema as ZodType & { values?: Set<unknown>; value?: unknown }
  if (literalSchema.values instanceof Set) {
    return Array.from(literalSchema.values)
  }
  return literalSchema.value === undefined ? [] : [literalSchema.value]
}

function getEnumValues(schema: ZodType): unknown[] {
  const kind = getSchemaKind(schema)
  if (kind !== 'ZodEnum') return []

  const enumSchema = schema as ZodType & { options?: unknown[]; enum?: Record<string, unknown> }
  if (Array.isArray(enumSchema.options)) {
    return enumSchema.options
  }
  if (enumSchema.enum && typeof enumSchema.enum === 'object') {
    return Array.from(new Set(Object.values(enumSchema.enum)))
  }
  return []
}

function dedupeSamples(samples: unknown[]): unknown[] {
  const serialized = new Set<string>()
  const result: unknown[] = []

  for (const sample of samples) {
    const key = JSON.stringify(sample, (_key, value) => (value instanceof Date ? value.toISOString() : value))
    if (serialized.has(key)) continue
    serialized.add(key)
    result.push(sample)
  }

  return result
}

function collectRepresentativeSamples(schema: ZodType, depth = 0): unknown[] {
  if (depth > 3) return []

  const kind = getSchemaKind(schema)
  const baseCandidates: Record<string, unknown[]> = {
    ZodString: ['', 'sample', 'hello@example.com', 'https://example.com', '550e8400-e29b-41d4-a716-446655440000'],
    ZodNumber: [0, 1, -1, 42, 3.14],
    ZodBoolean: [true, false],
    ZodBigInt: [0n, 1n, -1n],
    ZodDate: [new Date('2024-01-01T00:00:00.000Z')],
    ZodNull: [null],
    ZodUndefined: [undefined],
  }

  if (kind in baseCandidates) {
    const candidates = baseCandidates[kind]
    return candidates ? candidates.filter((sample) => schema.safeParse(sample).success) : []
  }

  if (kind === 'ZodLiteral') {
    return getLiteralValues(schema).filter((sample) => schema.safeParse(sample).success)
  }

  if (kind === 'ZodEnum') {
    return getEnumValues(schema).filter((sample) => schema.safeParse(sample).success)
  }

  if (kind === 'ZodArray') {
    const elementSchema = getArrayElementSchema(schema)
    if (!elementSchema) return []
    const elementSamples = collectRepresentativeSamples(elementSchema, depth + 1)
    const candidates = [[], ...elementSamples.map((sample) => [sample])]
    return dedupeSamples(candidates.filter((sample) => schema.safeParse(sample).success))
  }

  if (kind === 'ZodTuple') {
    const items = getTupleItems(schema)
    if (items.length === 0) {
      return schema.safeParse([]).success ? [[]] : []
    }
    const tupleSample = items.map((item) => collectRepresentativeSamples(item, depth + 1)[0]).filter((sample) => sample !== undefined)
    if (tupleSample.length !== items.length) return []
    return schema.safeParse(tupleSample).success ? [tupleSample] : []
  }

  if (kind === 'ZodUnion') {
    return dedupeSamples(getUnionOptions(schema).flatMap((option) => collectRepresentativeSamples(option, depth + 1))).filter(
      (sample) => schema.safeParse(sample).success
    )
  }

  if (kind === 'ZodObject') {
    const shape = getObjectShape(schema)
    if (!shape) return []
    const objectSample: Record<string, unknown> = {}

    for (const [key, valueSchema] of Object.entries(shape)) {
      const childSamples = collectRepresentativeSamples(valueSchema, depth + 1)
      const childSample = childSamples.find((sample) => sample !== undefined)
      if (childSample === undefined) {
        if (isSchemaOptional(valueSchema)) continue
        return []
      }
      objectSample[key] = childSample
    }

    return schema.safeParse(objectSample).success ? [objectSample] : []
  }

  const fallbackCandidates = [undefined, null, '', 'sample', 0, 1, true, false, [], {}, { value: 'sample' }]
  return dedupeSamples(fallbackCandidates.filter((sample) => schema.safeParse(sample).success))
}

function areSchemasCompatible(outputSchema: ZodType, inputSchema: ZodType): boolean {
  if (outputSchema === inputSchema) return true

  if (isSchemaOptional(outputSchema) && !isSchemaOptional(inputSchema)) return false
  if (isSchemaNullable(outputSchema) && !isSchemaNullable(inputSchema)) return false

  const outputKind = getSchemaKind(outputSchema)
  const inputKind = getSchemaKind(inputSchema)

  if (inputKind === 'ZodAny' || inputKind === 'ZodUnknown') return true
  if (outputKind === 'ZodNever') return true

  if (inputKind === 'ZodUnion') {
    const inputOptions = getUnionOptions(inputSchema)
    return inputOptions.some((option) => areSchemasCompatible(outputSchema, option))
  }

  if (outputKind === 'ZodUnion') {
    const outputOptions = getUnionOptions(outputSchema)
    return outputOptions.length > 0 && outputOptions.every((option) => areSchemasCompatible(option, inputSchema))
  }

  if (outputKind === 'ZodObject' && inputKind === 'ZodObject') {
    const outputShape = getObjectShape(outputSchema)
    const inputShape = getObjectShape(inputSchema)
    if (!outputShape || !inputShape) return false

    for (const [key, inputChildSchema] of Object.entries(inputShape)) {
      const outputChildSchema = outputShape[key]
      if (!outputChildSchema) {
        if (isSchemaOptional(inputChildSchema)) continue
        return false
      }

      if (!areSchemasCompatible(outputChildSchema, inputChildSchema)) {
        return false
      }
    }

    return true
  }

  if (outputKind === 'ZodArray' && inputKind === 'ZodArray') {
    const outputElement = getArrayElementSchema(outputSchema)
    const inputElement = getArrayElementSchema(inputSchema)
    if (!outputElement || !inputElement) return false
    return areSchemasCompatible(outputElement, inputElement)
  }

  if (outputKind === 'ZodTuple' && inputKind === 'ZodTuple') {
    const outputItems = getTupleItems(outputSchema)
    const inputItems = getTupleItems(inputSchema)
    if (outputItems.length !== inputItems.length) return false
    return outputItems.every((item, index) => {
      const inputItem = inputItems[index]
      return inputItem ? areSchemasCompatible(item, inputItem) : false
    })
  }

  const samples = collectRepresentativeSamples(outputSchema)
  if (samples.length === 0) {
    return outputKind === inputKind
  }

  return samples.every((sample) => inputSchema.safeParse(sample).success)
}

function validateEdgeSchemasAreCompatible(nodes: NodeInstance[], edges: Edge[]): void {
  for (const edge of edges) {
    const sourceNode = findNodeById(nodes, edge.sourceNodeId)
    const targetNode = findNodeById(nodes, edge.targetNodeId)
    if (!sourceNode || !targetNode) continue

    const sourceOutput = findOutputPortById(sourceNode, edge.sourcePortId)
    const targetInput = findInputPortById(targetNode, edge.targetPortId)
    if (!sourceOutput || !targetInput) continue

    if (areSchemasCompatible(sourceOutput.schema, targetInput.schema)) continue

    throw new Error(
      `Schema incompatibility between output port "${sourceOutput.name}" (id: ${sourceOutput.id}) on node "${sourceNode.name}" and input port "${targetInput.name}" (id: ${targetInput.id}) on node "${targetNode.name}"`
    )
  }
}

function validateGraphIsAcyclic(nodes: NodeInstance[], edges: Edge[]): void {
  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const node of nodes) {
    adjacency.set(node.id, [])
    inDegree.set(node.id, 0)
  }

  for (const edge of edges) {
    const neighbors = adjacency.get(edge.sourceNodeId)
    if (!neighbors) continue
    neighbors.push(edge.targetNodeId)
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1)
  }

  const queue = nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0).map((node) => node.id)
  let visitedCount = 0

  while (queue.length > 0) {
    const currentNodeId = queue.shift()
    if (!currentNodeId) continue

    visitedCount += 1
    const neighbors = adjacency.get(currentNodeId) ?? []

    for (const neighborId of neighbors) {
      const nextDegree = (inDegree.get(neighborId) ?? 0) - 1
      inDegree.set(neighborId, nextDegree)
      if (nextDegree === 0) {
        queue.push(neighborId)
      }
    }
  }

  if (visitedCount !== nodes.length) {
    throw new Error('Cycle detected in flow graph; only DAG flows are supported')
  }
}

function validateFlowStructure(nodes: NodeInstance[], edges: Edge[]): void {
  validateNodeIdsAreUnique(nodes)
  validateEdgeNodesExist(nodes, edges)
  validateEdgeSourcePortsBelongToSourceOutputs(nodes, edges)
  validateEdgeTargetPortsBelongToTargetInputs(nodes, edges)
  validateInputPortsHaveSingleIncomingEdge(nodes, edges)
  validateAtLeastOneStartNode(nodes)
  validateStartNodesHaveNoIncomingEdges(nodes, edges)
  validateStartNodesHaveOutputs(nodes)
  validateNoSelfLoops(nodes, edges)
  validateEdgeSchemasAreCompatible(nodes, edges)
  validateGraphIsAcyclic(nodes, edges)
}

export {
  areSchemasCompatible,
  validateAtLeastOneStartNode,
  validateEdgeNodesExist,
  validateEdgeSchemasAreCompatible,
  validateEdgeSourcePortsBelongToSourceOutputs,
  validateEdgeTargetPortsBelongToTargetInputs,
  validateFlowStructure,
  validateGraphIsAcyclic,
  validateInputPortsHaveSingleIncomingEdge,
  validateNodeIdsAreUnique,
  validateNoSelfLoops,
  validateStartNodesHaveNoIncomingEdges,
  validateStartNodesHaveOutputs,
}
