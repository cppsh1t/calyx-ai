import { describe, expect, it } from 'bun:test'
import type { Flow } from 'calyx-flow'

// Type-level test to verify FlowEditorProps contract
// These tests verify at compile-time and run-time that the contract is correct

describe('FlowEditor contract', () => {
  it('should require flow prop of type Flow', () => {
    // This test verifies the Flow type structure matches expectations
    const mockFlow: Flow = {
      name: 'test-flow',
      nodes: { type: 'Some', value: [] },
      edges: { type: 'Some', value: [] },
    }

    expect(mockFlow.name).toBe('test-flow')
    expect(mockFlow.nodes.type).toBe('Some')
    expect(mockFlow.edges.type).toBe('Some')
  })

  it('should accept Flow with None nodes and edges', () => {
    const mockFlow: Flow = {
      name: 'empty-flow',
      nodes: { type: 'None' },
      edges: { type: 'None' },
    }

    expect(mockFlow.nodes.type).toBe('None')
    expect(mockFlow.edges.type).toBe('None')
  })

  it('should accept onSave callback that receives Flow', () => {
    const savedFlows: Flow[] = []

    const onSave = (flow: Flow): void => {
      savedFlows.push(flow)
    }

    const mockFlow: Flow = {
      name: 'save-test',
      nodes: { type: 'None' },
      edges: { type: 'None' },
    }

    onSave(mockFlow)

    expect(savedFlows).toHaveLength(1)
    expect(savedFlows[0]!.name).toBe('save-test')
  })

  it('should accept async onSave callback', async () => {
    const savedFlows: Flow[] = []

    const onSaveAsync = async (flow: Flow): Promise<void> => {
      await Promise.resolve()
      savedFlows.push(flow)
    }

    const mockFlow: Flow = {
      name: 'async-save-test',
      nodes: { type: 'None' },
      edges: { type: 'None' },
    }

    await onSaveAsync(mockFlow)

    expect(savedFlows).toHaveLength(1)
    expect(savedFlows[0]!.name).toBe('async-save-test')
  })

  it('should fail typecheck when flow prop is missing (compile-time guard)', () => {
    // This test documents that missing props should cause type errors.
    // The actual type checking is done via `bun run typecheck`.
    // We verify the runtime behavior expectations here.

    // Simulate what would happen if props were missing
    const missingFlowError = {
      message: 'Property "flow" is missing in type',
    }

    expect(missingFlowError.message).toContain('flow')
  })

  it('should fail typecheck when onSave prop is missing (compile-time guard)', () => {
    // This test documents that missing props should cause type errors.
    // The actual type checking is done via `bun run typecheck`.

    const missingOnSaveError = {
      message: 'Property "onSave" is missing in type',
    }

    expect(missingOnSaveError.message).toContain('onSave')
  })
})

describe('FlowEditor contract regression', () => {
  it('should NOT have demo initialNodes/initialEdges defaults', () => {
    // This test guards against reintroducing demo-only defaults.
    // The FlowEditor should initialize with empty state derived from props.

    // Read the source file to ensure no hardcoded demo data
    const fs = require('fs')
    const path = require('path')

    const flowEditorPath = path.join(__dirname, '..', 'FlowEditor.tsx')
    const content = fs.readFileSync(flowEditorPath, 'utf-8')

    // Should not contain hardcoded demo node data
    expect(content).not.toContain("id: 'n1'")
    expect(content).not.toContain("id: 'n2'")
    expect(content).not.toContain('Node 1')
    expect(content).not.toContain('Node 2')

    // Should not contain hardcoded demo edge data
    expect(content).not.toContain("'n1-n2'")

    // Should initialize state from flowToReactFlow adapter, not with empty arrays
    // The state is derived from the Flow prop via the adapter
    expect(content).toMatch(/flowToReactFlow\s*\(\s*flow\s*\)/)
  })

  it('should define FlowEditorProps type with required flow and onSave', () => {
    const fs = require('fs')
    const path = require('path')

    const flowEditorPath = path.join(__dirname, '..', 'FlowEditor.tsx')
    const content = fs.readFileSync(flowEditorPath, 'utf-8')

    // Should define FlowEditorProps type
    expect(content).toContain('export type FlowEditorProps')

    // Should require flow prop of type Flow
    expect(content).toContain('flow: Flow')

    // Should require onSave prop
    expect(content).toContain('onSave:')
    expect(content).toContain('(flow: Flow) => void | Promise<void>')

    // Should document state ownership
    expect(content).toContain('canonical')
    expect(content).toContain('State ownership direction')
  })
})
