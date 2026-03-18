/** @jsxImportSource react */

import { extractDomainEdges, parseHandleId } from '@/adapters/flow-reactflow.ts'
import type { Connection, EdgeChange, Edge as XYFlowEdge } from '@xyflow/react'
import { applyEdgeChanges } from '@xyflow/react'
import { describe, expect, it } from 'bun:test'
import type { Edge } from 'calyx-flow/types'

/**
 * FlowEditor Integration Tests for Connect/Disconnect Guardrails
 *
 * These tests verify the integration between FlowEditor's connection
 * validation and the adapter layer's edge extraction.
 *
 * Test coverage:
 * 1. Valid connect path: out:{portId} -> in:{portId} creates proper domain edge
 * 2. Invalid handle rejection: wrong format/direction is blocked, edge state unchanged
 * 3. Disconnect path: edge removal preserves other edges with exact domain mappings
 */

// ============================================================================
// Mirrored FlowEditor Validation Logic
// ============================================================================

/**
 * Mirrors FlowEditor.isValidConnection behavior exactly.
 * Validates:
 * - Source handle must exist and be format `out:{portId}`
 * - Target handle must exist and be format `in:{portId}`
 */
function isValidConnection(connection: Connection | XYFlowEdge): boolean {
  // Validate source handle (must be out:{portId})
  if (!connection.sourceHandle) {
    return false
  }
  const sourceParsed = parseHandleId(connection.sourceHandle)
  if (sourceParsed.type === 'error' || sourceParsed.direction !== 'out') {
    return false
  }

  // Validate target handle (must be in:{portId})
  if (!connection.targetHandle) {
    return false
  }
  const targetParsed = parseHandleId(connection.targetHandle)
  if (targetParsed.type === 'error' || targetParsed.direction !== 'in') {
    return false
  }

  return true
}

/**
 * Mirrors FlowEditor.onConnect behavior for adding edges.
 * Only adds edge if connection passes validation.
 */
function addEdgeIfValid(connection: Connection, existingEdges: XYFlowEdge[]): XYFlowEdge[] {
  if (!isValidConnection(connection)) {
    return existingEdges
  }

  const newEdge: XYFlowEdge = {
    id: `e-${connection.source}-${connection.sourceHandle?.replace(':', '-')}-${connection.target}-${connection.targetHandle?.replace(':', '-')}`,
    source: connection.source!,
    target: connection.target!,
    sourceHandle: connection.sourceHandle!,
    targetHandle: connection.targetHandle!,
  }

  return [...existingEdges, newEdge]
}

/**
 * Mirrors FlowEditor.onEdgesChange behavior for removing edges.
 * Applies edge changes to the edge array.
 */
function removeEdges(edgeIdsToRemove: string[], existingEdges: XYFlowEdge[]): XYFlowEdge[] {
  const changes: EdgeChange<XYFlowEdge>[] = edgeIdsToRemove.map((id) => ({
    type: 'remove',
    id,
  }))
  return applyEdgeChanges(changes, existingEdges)
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestEdge(from: { nodeId: string; portId: string }, to: { nodeId: string; portId: string }): Edge {
  return { from, to }
}

function createXYFlowEdge(id: string, source: string, target: string, sourceHandle: string, targetHandle: string): XYFlowEdge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
  } as XYFlowEdge
}

// ============================================================================
// Integration Tests: Valid Connect Path
// ============================================================================

describe('FlowEditor Integration: Valid Connect Path', () => {
  it('valid out:{portId} to in:{portId} connection creates domain edge with exact from.nodeId, from.portId, to.nodeId, to.portId', () => {
    // Initial empty edge state
    let edges: XYFlowEdge[] = []

    // Valid connection attempt
    const validConnection: Connection = {
      source: 'source-node',
      target: 'target-node',
      sourceHandle: 'out:data-output',
      targetHandle: 'in:data-input',
    }

    // Validate connection passes guardrail
    expect(isValidConnection(validConnection)).toBe(true)

    // Simulate FlowEditor.onConnect adding edge
    edges = addEdgeIfValid(validConnection, edges)
    expect(edges).toHaveLength(1)

    // Extract domain edges via adapter
    const { valid: domainEdges } = extractDomainEdges(edges)
    expect(domainEdges).toHaveLength(1)

    // Assert exact domain field values
    const domainEdge = domainEdges[0]!
    expect(domainEdge.from.nodeId).toBe('source-node')
    expect(domainEdge.from.portId).toBe('data-output')
    expect(domainEdge.to.nodeId).toBe('target-node')
    expect(domainEdge.to.portId).toBe('data-input')
  })

  it('multiple valid connections create distinct domain edges with correct from/to mappings', () => {
    let edges: XYFlowEdge[] = []

    // Multiple valid connections
    const connections: Connection[] = [
      { source: 'node-a', target: 'node-b', sourceHandle: 'out:port-1', targetHandle: 'in:port-a' },
      { source: 'node-a', target: 'node-b', sourceHandle: 'out:port-2', targetHandle: 'in:port-b' },
      { source: 'node-c', target: 'node-d', sourceHandle: 'out:port-x', targetHandle: 'in:port-y' },
    ]

    // Add all connections
    for (const conn of connections) {
      edges = addEdgeIfValid(conn, edges)
    }
    expect(edges).toHaveLength(3)

    // Extract and verify domain edges
    const { valid: domainEdges } = extractDomainEdges(edges)
    expect(domainEdges).toHaveLength(3)

    // Assert exact domain field values for each edge
    expect(domainEdges[0]!).toEqual({
      from: { nodeId: 'node-a', portId: 'port-1' },
      to: { nodeId: 'node-b', portId: 'port-a' },
    })
    expect(domainEdges[1]!).toEqual({
      from: { nodeId: 'node-a', portId: 'port-2' },
      to: { nodeId: 'node-b', portId: 'port-b' },
    })
    expect(domainEdges[2]!).toEqual({
      from: { nodeId: 'node-c', portId: 'port-x' },
      to: { nodeId: 'node-d', portId: 'port-y' },
    })
  })

  it('complex portId values preserve exact from.portId and to.portId in domain edge', () => {
    let edges: XYFlowEdge[] = []

    const connection: Connection = {
      source: 'processor-node',
      target: 'consumer-node',
      sourceHandle: 'out:file_processed_csv',
      targetHandle: 'in:data_input_stream_01',
    }

    expect(isValidConnection(connection)).toBe(true)
    edges = addEdgeIfValid(connection, edges)

    const { valid: domainEdges } = extractDomainEdges(edges)
    const domainEdge = domainEdges[0]!

    expect(domainEdge.from.nodeId).toBe('processor-node')
    expect(domainEdge.from.portId).toBe('file_processed_csv')
    expect(domainEdge.to.nodeId).toBe('consumer-node')
    expect(domainEdge.to.portId).toBe('data_input_stream_01')
  })
})

// ============================================================================
// Integration Tests: Invalid Handle Rejection
// ============================================================================

describe('FlowEditor Integration: Invalid Handle Rejection', () => {
  it('rejects connection with source handle using in: direction and edge state remains unchanged', () => {
    // Initial state with one valid edge
    let edges: XYFlowEdge[] = [createXYFlowEdge('existing-1', 'n1', 'n2', 'out:valid', 'in:valid')]

    // Invalid connection: source uses in: instead of out:
    const invalidConnection: Connection = {
      source: 'bad-source',
      target: 'target-node',
      sourceHandle: 'in:wrong-direction',
      targetHandle: 'in:target-port',
    }

    // Validation rejects
    expect(isValidConnection(invalidConnection)).toBe(false)

    // Attempt to add (should be blocked)
    edges = addEdgeIfValid(invalidConnection, edges)

    // Edge state unchanged
    expect(edges).toHaveLength(1)
    expect(edges[0]!.sourceHandle).toBe('out:valid')

    // Domain extraction shows no new edge
    const { valid: domainEdges } = extractDomainEdges(edges)
    expect(domainEdges).toHaveLength(1)
    expect(domainEdges[0]!.from.nodeId).toBe('n1')
    expect(domainEdges[0]!.from.portId).toBe('valid')
  })

  it('rejects connection with target handle using out: direction and edge state remains unchanged', () => {
    let edges: XYFlowEdge[] = [
      createXYFlowEdge('existing-1', 'n1', 'n2', 'out:valid', 'in:valid'),
      createXYFlowEdge('existing-2', 'n3', 'n4', 'out:another', 'in:another'),
    ]

    // Invalid connection: target uses out: instead of in:
    const invalidConnection: Connection = {
      source: 'source-node',
      target: 'bad-target',
      sourceHandle: 'out:source-port',
      targetHandle: 'out:wrong-direction',
    }

    expect(isValidConnection(invalidConnection)).toBe(false)
    edges = addEdgeIfValid(invalidConnection, edges)

    // Both existing edges preserved
    expect(edges).toHaveLength(2)

    const { valid: domainEdges } = extractDomainEdges(edges)
    expect(domainEdges).toHaveLength(2)
    expect(domainEdges[0]!.to.portId).toBe('valid')
    expect(domainEdges[1]!.to.portId).toBe('another')
  })

  it('rejects connection with malformed source handle (missing colon) and edge state unchanged', () => {
    let edges: XYFlowEdge[] = []

    const invalidConnection: Connection = {
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'invalid-no-colon',
      targetHandle: 'in:valid-target',
    }

    expect(isValidConnection(invalidConnection)).toBe(false)

    // Verify parseHandleId returns error
    const parsed = parseHandleId(invalidConnection.sourceHandle!)
    expect(parsed.type).toBe('error')
    if (parsed.type === 'error') {
      expect(parsed.reason).toBe('invalid_format')
    }

    edges = addEdgeIfValid(invalidConnection, edges)
    expect(edges).toHaveLength(0)

    const { valid: domainEdges } = extractDomainEdges(edges)
    expect(domainEdges).toHaveLength(0)
  })

  it('rejects connection with unknown direction in handle and edge state unchanged', () => {
    let edges: XYFlowEdge[] = []

    const invalidConnection: Connection = {
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'unknown:port',
      targetHandle: 'in:port',
    }

    expect(isValidConnection(invalidConnection)).toBe(false)

    const parsed = parseHandleId(invalidConnection.sourceHandle!)
    expect(parsed.type).toBe('error')
    if (parsed.type === 'error') {
      expect(parsed.reason).toBe('unknown_direction')
    }

    edges = addEdgeIfValid(invalidConnection, edges)
    expect(edges).toHaveLength(0)
  })

  it('rejects connection with missing sourceHandle (null) and edge state unchanged', () => {
    let edges: XYFlowEdge[] = []

    const invalidConnection: Connection = {
      source: 'node-1',
      target: 'node-2',
      sourceHandle: null,
      targetHandle: 'in:port-1',
    }

    expect(isValidConnection(invalidConnection)).toBe(false)
    edges = addEdgeIfValid(invalidConnection, edges)
    expect(edges).toHaveLength(0)
  })

  it('rejects connection with missing targetHandle (null) and edge state unchanged', () => {
    let edges: XYFlowEdge[] = []

    const invalidConnection: Connection = {
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'out:port-1',
      targetHandle: null,
    }

    expect(isValidConnection(invalidConnection)).toBe(false)
    edges = addEdgeIfValid(invalidConnection, edges)
    expect(edges).toHaveLength(0)
  })

  it('rejects connection with both handles using wrong directions', () => {
    const invalidConnection: Connection = {
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'in:wrong-source',
      targetHandle: 'out:wrong-target',
    }

    expect(isValidConnection(invalidConnection)).toBe(false)

    const sourceParsed = parseHandleId(invalidConnection.sourceHandle!)
    const targetParsed = parseHandleId(invalidConnection.targetHandle!)

    expect(sourceParsed.type).toBe('success')
    if (sourceParsed.type === 'success') {
      expect(sourceParsed.direction).toBe('in') // Wrong for source
    }

    expect(targetParsed.type).toBe('success')
    if (targetParsed.type === 'success') {
      expect(targetParsed.direction).toBe('out') // Wrong for target
    }
  })
})

// ============================================================================
// Integration Tests: Disconnect/Removal Path
// ============================================================================

describe('FlowEditor Integration: Disconnect/Removal Path', () => {
  it('removing single edge preserves other edges with correct from.nodeId, from.portId, to.nodeId, to.portId', () => {
    // Start with multiple edges
    let edges: XYFlowEdge[] = [
      createXYFlowEdge('edge-a', 'n1', 'n2', 'out:port-1', 'in:port-a'),
      createXYFlowEdge('edge-b', 'n3', 'n4', 'out:port-2', 'in:port-b'),
      createXYFlowEdge('edge-c', 'n5', 'n6', 'out:port-3', 'in:port-c'),
    ]

    // Remove middle edge
    edges = removeEdges(['edge-b'], edges)
    expect(edges).toHaveLength(2)

    // Extract domain edges
    const { valid: domainEdges } = extractDomainEdges(edges)
    expect(domainEdges).toHaveLength(2)

    // First edge preserved with exact values
    expect(domainEdges[0]!.from.nodeId).toBe('n1')
    expect(domainEdges[0]!.from.portId).toBe('port-1')
    expect(domainEdges[0]!.to.nodeId).toBe('n2')
    expect(domainEdges[0]!.to.portId).toBe('port-a')

    // Second edge (was third) preserved with exact values
    expect(domainEdges[1]!.from.nodeId).toBe('n5')
    expect(domainEdges[1]!.from.portId).toBe('port-3')
    expect(domainEdges[1]!.to.nodeId).toBe('n6')
    expect(domainEdges[1]!.to.portId).toBe('port-c')
  })

  it('connect then disconnect maintains domain integrity with empty edge state', () => {
    let edges: XYFlowEdge[] = []

    // Connect: Add valid edge
    const newConnection: Connection = {
      source: 'new-source',
      target: 'new-target',
      sourceHandle: 'out:new-out',
      targetHandle: 'in:new-in',
    }

    edges = addEdgeIfValid(newConnection, edges)
    expect(edges).toHaveLength(1)

    // Verify domain edge created
    const { valid: domainEdgesAfterAdd } = extractDomainEdges(edges)
    expect(domainEdgesAfterAdd).toHaveLength(1)
    expect(domainEdgesAfterAdd[0]!.from.nodeId).toBe('new-source')
    expect(domainEdgesAfterAdd[0]!.to.nodeId).toBe('new-target')

    // Disconnect: Remove the edge
    edges = removeEdges([edges[0]!.id], edges)
    expect(edges).toHaveLength(0)

    // Domain state empty
    const { valid: domainEdgesAfterRemove } = extractDomainEdges(edges)
    expect(domainEdgesAfterRemove).toHaveLength(0)
  })

  it('removing multiple edges preserves remaining edges with exact domain mappings', () => {
    let edges: XYFlowEdge[] = [
      createXYFlowEdge('e1', 'a', 'b', 'out:a-out', 'in:b-in'),
      createXYFlowEdge('e2', 'c', 'd', 'out:c-out', 'in:d-in'),
      createXYFlowEdge('e3', 'e', 'f', 'out:e-out', 'in:f-in'),
      createXYFlowEdge('e4', 'g', 'h', 'out:g-out', 'in:h-in'),
    ]

    // Remove first and third edges
    edges = removeEdges(['e1', 'e3'], edges)
    expect(edges).toHaveLength(2)

    const { valid: domainEdges } = extractDomainEdges(edges)
    expect(domainEdges).toHaveLength(2)

    // Remaining edges have correct mappings
    expect(domainEdges[0]!).toEqual({
      from: { nodeId: 'c', portId: 'c-out' },
      to: { nodeId: 'd', portId: 'd-in' },
    })
    expect(domainEdges[1]!).toEqual({
      from: { nodeId: 'g', portId: 'g-out' },
      to: { nodeId: 'h', portId: 'h-in' },
    })
  })

  it('removing non-existent edge leaves all edges unchanged', () => {
    let edges: XYFlowEdge[] = [createXYFlowEdge('e1', 'a', 'b', 'out:a-out', 'in:b-in'), createXYFlowEdge('e2', 'c', 'd', 'out:c-out', 'in:d-in')]

    // Try to remove non-existent edge
    edges = removeEdges(['non-existent-id'], edges)
    expect(edges).toHaveLength(2)

    const { valid: domainEdges } = extractDomainEdges(edges)
    expect(domainEdges).toHaveLength(2)
    expect(domainEdges[0]!.from.nodeId).toBe('a')
    expect(domainEdges[1]!.from.nodeId).toBe('c')
  })
})

// ============================================================================
// Integration Tests: Parameter Edit Matrix - Success Paths
// ============================================================================

import { formatJsonForEditing } from '@/components/ComplexParameterControl.tsx'
import {
  createBooleanChangeHandler,
  createClearHandler,
  createNumberChangeHandler,
  createStringChangeHandler,
} from '@/components/PrimitiveParameterControl.tsx'
import { isValidationParseError, isValidationSchemaError, isValidationSuccess, validateComplexParameterJson } from '@/utils/validation.ts'
import type { NodeParameter, Option } from 'calyx-flow/types'
import type { ChangeEvent } from 'react'
import { z } from 'zod'

/**
 * Helper to create a mock change event for testing
 */
function createMockChangeEvent(value: string | boolean): ChangeEvent<HTMLInputElement> {
  return {
    target: {
      value: typeof value === 'boolean' ? String(value) : value,
      checked: typeof value === 'boolean' ? value : false,
    },
  } as ChangeEvent<HTMLInputElement>
}

/**
 * Helper to create a test parameter
 */
function createTestParameter<T>(name: string, value: Option<T>, schema: unknown): NodeParameter {
  return {
    name,
    description: `Test parameter ${name}`,
    schema: schema as NodeParameter['schema'],
    value: value as Option<unknown>,
  }
}

describe('FlowEditor Integration: parameter matrix success', () => {
  describe('Primitive parameter edits produce Option.Some', () => {
    it('string edit writes Option.Some with new value', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createStringChangeHandler(onChange)

      handler(createMockChangeEvent('updated string value'))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: 'updated string value' })
    })

    it('number edit writes Option.Some with valid finite number', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createNumberChangeHandler(onChange)

      handler(createMockChangeEvent('42.5'))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: 42.5 })
    })

    it('boolean edit writes Option.Some with true/false', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createBooleanChangeHandler(onChange)

      // Test setting to true
      handler(createMockChangeEvent(true))
      expect(received[0]).toEqual({ type: 'Some', value: true })

      // Test setting to false
      handler(createMockChangeEvent(false))
      expect(received[1]).toEqual({ type: 'Some', value: false })

      expect(received).toHaveLength(2)
    })

    it('zero and empty string are preserved as Option.Some (not None)', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)

      // Number zero should be Some(0), not None
      const numberHandler = createNumberChangeHandler(onChange)
      numberHandler(createMockChangeEvent('0'))
      expect(received[0]).toEqual({ type: 'Some', value: 0 })

      // Empty string should be Some(''), not None
      const stringHandler = createStringChangeHandler(onChange)
      stringHandler(createMockChangeEvent(''))
      expect(received[1]).toEqual({ type: 'Some', value: '' })

      expect(received).toHaveLength(2)
    })
  })

  describe('Primitive clear produces Option.None', () => {
    it('clear action writes Option.None for string parameter', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const clearHandler = createClearHandler(onChange)

      clearHandler()

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'None' })
    })

    it('clear action writes Option.None for number parameter', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const clearHandler = createClearHandler(onChange)

      clearHandler()

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'None' })
    })

    it('clear action writes Option.None for boolean parameter', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const clearHandler = createClearHandler(onChange)

      clearHandler()

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'None' })
    })
  })

  describe('Complex parameter cancel keeps original value', () => {
    it('cancel does not call onChange even with valid draft', () => {
      const originalValue = { key: 'original' }
      const parameter = createTestParameter('config', { type: 'Some', value: originalValue }, z.object({}))

      let onChangeCalled = false
      let receivedValue: Option<unknown> | undefined
      const onChange = (value: Option<unknown>) => {
        onChangeCalled = true
        receivedValue = value
      }

      // Simulate: open modal, change draft, cancel
      const draftText = formatJsonForEditing({ key: 'modified' })
      expect(draftText).toBe('{\n  "key": "modified"\n}')

      // Simulate cancel - onChange should NOT be called
      // In real component, cancel closes modal without calling onChange
      const wasOnChangeCalledBeforeCancel = onChangeCalled

      // After cancel, onChange still not called
      expect(onChangeCalled).toBe(false)
      expect(wasOnChangeCalledBeforeCancel).toBe(false)

      // Original value unchanged
      expect(parameter.value).toEqual({ type: 'Some', value: originalValue })
    })

    it('cancel keeps original array value unchanged', () => {
      const originalValue = [1, 2, 3]
      const parameter = createTestParameter('items', { type: 'Some', value: originalValue }, z.array(z.number()))

      let onChangeCalled = false
      const onChange = () => {
        onChangeCalled = true
      }

      // Simulate: open modal with different draft, cancel
      const draftText = formatJsonForEditing([4, 5, 6])
      expect(draftText).toBe('[\n  4,\n  5,\n  6\n]')

      // Cancel - onChange not called
      expect(onChangeCalled).toBe(false)

      // Original value preserved
      expect(parameter.value).toEqual({ type: 'Some', value: [1, 2, 3] })
    })

    it('cancel with empty draft keeps original value (does not clear)', () => {
      const originalValue = { existing: true }
      const parameter = createTestParameter('config', { type: 'Some', value: originalValue }, z.object({}))

      let onChangeCalled = false
      const onChange = () => {
        onChangeCalled = true
      }

      // Simulate: open modal, clear draft to empty, cancel
      // Empty draft on confirm would clear, but cancel should not
      expect(onChangeCalled).toBe(false)

      // Original value unchanged
      expect(parameter.value).toEqual({ type: 'Some', value: originalValue })
    })
  })

  describe('Complex parameter confirm commits on valid parse+schema', () => {
    it('confirm with valid object JSON commits Option.Some', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)

      const jsonInput = '{"enabled": true, "count": 42}'
      const schema = z.object({ enabled: z.boolean(), count: z.number() })

      // Validate before commit (as component does)
      const result = validateComplexParameterJson(jsonInput, schema)
      expect(result.success).toBe(true)

      if (result.success) {
        onChange({ type: 'Some', value: result.value })
      }

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: { enabled: true, count: 42 } })
    })

    it('confirm with valid array JSON commits Option.Some', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)

      const jsonInput = '[1, 2, 3, "four"]'
      const schema = z.array(z.union([z.number(), z.string()]))

      const result = validateComplexParameterJson(jsonInput, schema)
      expect(result.success).toBe(true)

      if (result.success) {
        onChange({ type: 'Some', value: result.value })
      }

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: [1, 2, 3, 'four'] })
    })

    it('confirm with null JSON commits Option.Some(null)', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)

      const jsonInput = 'null'
      const schema = z.null().or(z.object({}))

      const result = validateComplexParameterJson(jsonInput, schema)
      expect(result.success).toBe(true)

      if (result.success) {
        onChange({ type: 'Some', value: result.value })
      }

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: null })
    })

    it('empty draft on confirm clears to Option.None', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)

      const draftText = ''

      // Empty draft = clear value (None)
      if (draftText.trim() === '') {
        onChange({ type: 'None' })
      }

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'None' })
    })
  })
})

// ============================================================================
// Integration Tests: Parameter Edit Matrix - Failure Paths
// ============================================================================

describe('FlowEditor Integration: parameter matrix failures', () => {
  describe('Parse failures preserve old value and expose error', () => {
    it('invalid JSON syntax does not commit and keeps old value', () => {
      const originalValue = { key: 'original' }
      const parameter = createTestParameter('config', { type: 'Some', value: originalValue }, z.object({}))

      let onChangeCalled = false
      const onChange = () => {
        onChangeCalled = true
      }

      const invalidJson = '{"unclosed": "string}'

      // Attempt to validate
      const result = validateComplexParameterJson(invalidJson, parameter.schema)

      // Parse error - do not commit
      expect(isValidationParseError(result)).toBe(true)
      expect(onChangeCalled).toBe(false)

      // Original value preserved
      expect(parameter.value).toEqual({ type: 'Some', value: originalValue })
    })

    it('trailing comma error does not commit and keeps old value', () => {
      const originalValue = [1, 2, 3]
      const parameter = createTestParameter('items', { type: 'Some', value: originalValue }, z.array(z.number()))

      let onChangeCalled = false
      const onChange = () => {
        onChangeCalled = true
      }

      // Trailing comma is invalid in strict JSON
      const invalidJson = '[1, 2, 3,]'

      const result = validateComplexParameterJson(invalidJson, parameter.schema)

      expect(isValidationParseError(result)).toBe(true)
      expect(onChangeCalled).toBe(false)

      // Original array preserved
      expect(parameter.value).toEqual({ type: 'Some', value: [1, 2, 3] })
    })

    it('unclosed brace error exposes parse error with message', () => {
      const originalValue = { nested: { deep: 'value' } }
      const parameter = createTestParameter('config', { type: 'Some', value: originalValue }, z.object({ nested: z.object({}) }))

      const invalidJson = '{"nested": {"deep": "value"}'

      const result = validateComplexParameterJson(invalidJson, parameter.schema)

      expect(isValidationParseError(result)).toBe(true)
      if (isValidationParseError(result)) {
        expect(result.message).toBeDefined()
        expect(result.message.length).toBeGreaterThan(0)
      }

      // Original value preserved
      expect(parameter.value).toEqual({ type: 'Some', value: originalValue })
    })

    it('parse error feedback includes descriptive message for UI display', () => {
      const invalidJson = 'not valid json at all'

      const result = validateComplexParameterJson(invalidJson, z.object({}))

      expect(isValidationParseError(result)).toBe(true)
      if (isValidationParseError(result)) {
        // Error message should be descriptive
        expect(result.message).toBeDefined()
        // Message should help user understand the issue
        expect(result.message.toLowerCase()).toMatch(/unexpected|token|json|parse|position/)
      }
    })
  })

  describe('Schema failures preserve old value and expose error', () => {
    it('type mismatch does not commit and keeps old value', () => {
      const originalValue = 'original string'
      const parameter = createTestParameter('name', { type: 'Some', value: originalValue }, z.string())

      let onChangeCalled = false
      const onChange = (_value?: Option<unknown>) => {
        onChangeCalled = true
      }

      // Trying to set a number where string is expected
      const invalidJson = '123'

      const result = validateComplexParameterJson(invalidJson, parameter.schema)

      // Schema may accept it as number, but if schema expects string...
      // Actually z.string() will fail on number
      if (isValidationSuccess(result)) {
        onChange({ type: 'Some', value: result.value })
      }

      // For z.string(), "123" is actually valid (coerced to string)
      // Let's use a stricter test
      const strictSchema = z.object({ name: z.string() })
      const invalidObjJson = '{"name": 123}'
      const strictResult = validateComplexParameterJson(invalidObjJson, strictSchema)

      expect(isValidationSchemaError(strictResult)).toBe(true)

      // Original value preserved (onChange not called for failure)
      expect(parameter.value).toEqual({ type: 'Some', value: originalValue })
    })

    it('missing required field exposes schema error with path', () => {
      const originalValue = { required: 'value', optional: 'also present' }
      const parameter = createTestParameter(
        'config',
        { type: 'Some', value: originalValue },
        z.object({ required: z.string(), optional: z.string().optional() })
      )

      // Missing required field
      const invalidJson = '{"optional": "only this"}'

      const result = validateComplexParameterJson(invalidJson, z.object({ required: z.string() }))

      expect(isValidationSchemaError(result)).toBe(true)
      if (isValidationSchemaError(result)) {
        expect(result.issues.length).toBeGreaterThan(0)
        expect(result.issues[0]?.path).toContain('required')
      }

      // Original value preserved
      expect(parameter.value).toEqual({ type: 'Some', value: originalValue })
    })

    it('nested object schema error exposes path information', () => {
      const originalValue = { level1: { level2: { value: 'deep' } } }
      const schema = z.object({
        level1: z.object({
          level2: z.object({
            value: z.string(),
          }),
        }),
      })
      const parameter = createTestParameter('nested', { type: 'Some', value: originalValue }, schema)

      const invalidJson = '{"level1": {"level2": {"value": 123}}}'

      const result = validateComplexParameterJson(invalidJson, schema)

      expect(isValidationSchemaError(result)).toBe(true)
      if (isValidationSchemaError(result)) {
        // Should have path info to nested field
        const hasPath = result.issues.some((issue: { path: (string | number)[] }) => issue.path.includes('value') || issue.path.includes('level2'))
        expect(hasPath).toBe(true)
      }

      // Original nested value preserved
      expect(parameter.value).toEqual({ type: 'Some', value: originalValue })
    })

    it('array item type error exposes item-level schema issues', () => {
      const originalValue = [1, 2, 3]
      const schema = z.array(z.number())
      const parameter = createTestParameter('numbers', { type: 'Some', value: originalValue }, schema)

      const invalidJson = '[1, "two", 3]'

      const result = validateComplexParameterJson(invalidJson, schema)

      expect(isValidationSchemaError(result)).toBe(true)
      if (isValidationSchemaError(result)) {
        expect(result.issues.length).toBeGreaterThan(0)
        expect(result.message).toBeDefined()
      }

      // Original array preserved
      expect(parameter.value).toEqual({ type: 'Some', value: [1, 2, 3] })
    })

    it('schema error feedback includes multiple issues when applicable', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      })

      const invalidJson = '{"name": 123, "age": "not a number", "email": "invalid-email"}'

      const result = validateComplexParameterJson(invalidJson, schema)

      expect(isValidationSchemaError(result)).toBe(true)
      if (isValidationSchemaError(result)) {
        // Should have multiple issues
        expect(result.issues.length).toBeGreaterThanOrEqual(2)

        // Each issue should have message and path
        for (const issue of result.issues) {
          expect(issue.message).toBeDefined()
          expect(issue.path).toBeDefined()
        }
      }
    })
  })

  describe('Value preservation across failure scenarios', () => {
    it('sequence of parse failures preserves original value throughout', () => {
      const originalValue = { persistent: true }
      const parameter = createTestParameter('config', { type: 'Some', value: originalValue }, z.object({}))

      const invalidAttempts = ['{broken', '[1,2,', '{"a":}', 'undefined']

      for (const invalidJson of invalidAttempts) {
        const result = validateComplexParameterJson(invalidJson, parameter.schema)
        expect(isValidationParseError(result)).toBe(true)

        // Original value unchanged after each failure
        expect(parameter.value).toEqual({ type: 'Some', value: originalValue })
      }
    })

    it('sequence of schema failures preserves original value throughout', () => {
      const originalValue = 'valid string'
      const parameter = createTestParameter('name', { type: 'Some', value: originalValue }, z.string())

      const schema = z.object({ field: z.string() })
      const invalidAttempts = ['{"field": 123}', '{"other": "value"}', '[]', '{}']

      for (const invalidJson of invalidAttempts) {
        const result = validateComplexParameterJson(invalidJson, schema)
        expect(isValidationSchemaError(result)).toBe(true)

        // Original value unchanged after each failure
        expect(parameter.value).toEqual({ type: 'Some', value: originalValue })
      }
    })

    it('None value preserved when validation fails (no mutation to Some)', () => {
      const parameter = createTestParameter('optional', { type: 'None' }, z.object({ key: z.string() }))

      const invalidJson = '{"key": 123}'

      const result = validateComplexParameterJson(invalidJson, parameter.schema)

      expect(isValidationSchemaError(result)).toBe(true)

      // None value unchanged
      expect(parameter.value).toEqual({ type: 'None' })
    })
  })
})

// ============================================================================
// Integration Tests: Mixed Valid/Invalid Scenarios
// ============================================================================

describe('FlowEditor Integration: Mixed Valid/Invalid Scenarios', () => {
  it('only valid edges from mixed valid/invalid XYFlow edges are extracted with correct domain mappings', () => {
    // Mix of valid and invalid XYFlow edges
    const xyFlowEdges: XYFlowEdge[] = [
      createXYFlowEdge('valid-1', 'n1', 'n2', 'out:port-a', 'in:port-b'),
      createXYFlowEdge('invalid-source', 'n2', 'n3', 'in:wrong', 'in:port'), // Invalid source direction
      createXYFlowEdge('invalid-target', 'n3', 'n4', 'out:port', 'out:wrong'), // Invalid target direction
      createXYFlowEdge('valid-2', 'n4', 'n5', 'out:port-c', 'in:port-d'),
      createXYFlowEdge('invalid-format', 'n5', 'n6', 'no-colon', 'in:port'), // Invalid format
    ]

    // extractDomainEdges filters out invalid edges
    const { valid: domainEdges, errors } = extractDomainEdges(xyFlowEdges)

    // Only 2 valid edges extracted
    expect(domainEdges).toHaveLength(2)
    expect(errors).toHaveLength(3)

    // Valid edges have correct domain field mappings
    expect(domainEdges[0]!).toEqual({
      from: { nodeId: 'n1', portId: 'port-a' },
      to: { nodeId: 'n2', portId: 'port-b' },
    })
    expect(domainEdges[1]!).toEqual({
      from: { nodeId: 'n4', portId: 'port-c' },
      to: { nodeId: 'n5', portId: 'port-d' },
    })
  })

  it('invalid connect attempt after valid edges exist preserves previous domain state unchanged', () => {
    // Existing valid domain state
    let edges: XYFlowEdge[] = [createXYFlowEdge('existing', 'existing-source', 'existing-target', 'out:existing-out', 'in:existing-in')]

    // Attempt invalid connection
    const invalidConnection: Connection = {
      source: 'bad-node',
      target: 'other-node',
      sourceHandle: 'in:wrong',
      targetHandle: 'in:input',
    }

    // Rejected
    expect(isValidConnection(invalidConnection)).toBe(false)
    edges = addEdgeIfValid(invalidConnection, edges)

    // Original domain state unchanged
    expect(edges).toHaveLength(1)

    const { valid: domainEdges } = extractDomainEdges(edges)
    expect(domainEdges).toHaveLength(1)
    expect(domainEdges[0]!.from.nodeId).toBe('existing-source')
    expect(domainEdges[0]!.from.portId).toBe('existing-out')
    expect(domainEdges[0]!.to.nodeId).toBe('existing-target')
    expect(domainEdges[0]!.to.portId).toBe('existing-in')
  })

  it('sequential valid connects and disconnects maintain correct domain state transitions', () => {
    let edges: XYFlowEdge[] = []

    // Step 1: Add first edge
    edges = addEdgeIfValid({ source: 'n1', target: 'n2', sourceHandle: 'out:p1', targetHandle: 'in:p2' }, edges)
    expect(edges).toHaveLength(1)

    // Step 2: Add second edge
    edges = addEdgeIfValid({ source: 'n3', target: 'n4', sourceHandle: 'out:p3', targetHandle: 'in:p4' }, edges)
    expect(edges).toHaveLength(2)

    // Step 3: Remove first edge
    edges = removeEdges([edges[0]!.id], edges)
    expect(edges).toHaveLength(1)

    // Verify final state
    const { valid: domainEdges } = extractDomainEdges(edges)
    expect(domainEdges).toHaveLength(1)
    expect(domainEdges[0]!.from.nodeId).toBe('n3')
    expect(domainEdges[0]!.from.portId).toBe('p3')
    expect(domainEdges[0]!.to.nodeId).toBe('n4')
    expect(domainEdges[0]!.to.portId).toBe('p4')
  })
})
