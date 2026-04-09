import { buildNodeInstance } from '@/core/node.ts'
import { NodeRegistry } from '@/core/registry.ts'
import type { NodeData, NodeDefinition, NodeExecutor } from '@/types'
import { None, Some } from '@/utils/structure.ts'
import { describe, expect, test } from 'bun:test'
import z from 'zod'

describe('buildNodeInstance boundary validation', () => {
  const registryKey = 'demo/test'

  const executor: NodeExecutor = async () => ({ continue: true, data: null })

  function createInputDefinition(name: string) {
    return {
      name,
      description: `Input ${name}`,
      schema: z.string(),
      postCompile: None,
    }
  }

  function createInputData(id: string, name: string) {
    return {
      id,
      name,
    }
  }

  function createOutputDefinition(name: string, requiredInputs: string[] = ['inputA']) {
    return {
      name,
      description: `Output ${name}`,
      schema: z.string(),
      requiredInputs: requiredInputs.length > 0 ? Some(requiredInputs) : None,
      executor,
      postCompile: None,
    }
  }

  function createOutputData(id: string, name: string) {
    return {
      id,
      name,
    }
  }

  function createDefinition(overrides: Partial<NodeDefinition> = {}): NodeDefinition {
    return {
      name: 'Test Node',
      description: 'Node used in tests',
      type: ['test'],
      docs: 'docs',
      group: 'group',
      parameters: None,
      inputs: Some([createInputDefinition('inputA')]),
      outputs: Some([createOutputDefinition('outputA')]),
      ...overrides,
    }
  }

  function createNodeData(overrides: Partial<NodeData> = {}): NodeData {
    return {
      id: 'node-1',
      key: registryKey,
      name: 'Test Node',
      position: { x: 0, y: 0 },
      parameters: None,
      inputs: Some([createInputData('input-id-1', 'inputA')]),
      outputs: Some([createOutputData('output-id-1', 'outputA')]),
      ...overrides,
    }
  }

  function createRegistry(definition: NodeDefinition): NodeRegistry {
    const registry = new NodeRegistry()
    registry.register(registryKey, definition)
    return registry
  }

  test('builds a valid node instance', () => {
    const registry = createRegistry(createDefinition())

    expect(() => buildNodeInstance(registry, createNodeData())).not.toThrow()
  })

  test('rejects duplicate definition names', () => {
    const definition = createDefinition({
      inputs: Some([createInputDefinition('inputA'), createInputDefinition('inputA')]),
    })
    const registry = createRegistry(definition)

    expect(() => buildNodeInstance(registry, createNodeData())).toThrow(/Duplicate input port definition names found in node "Test Node": "inputA"/)
  })

  test('rejects duplicate data names', () => {
    const definition = createDefinition({
      inputs: Some([createInputDefinition('inputA'), createInputDefinition('inputB')]),
      outputs: Some([createOutputDefinition('outputA', ['inputA'])]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      inputs: Some([createInputData('input-id-1', 'inputA'), createInputData('input-id-2', 'inputA')]),
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Duplicate input port data names found in node "Test Node": "inputA"/)
  })

  test('rejects duplicate port ids', () => {
    const definition = createDefinition({
      inputs: Some([createInputDefinition('inputA'), createInputDefinition('inputB')]),
      outputs: Some([createOutputDefinition('outputA', ['inputA'])]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      inputs: Some([createInputData('shared-id', 'inputA'), createInputData('shared-id', 'inputB')]),
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Duplicate input port ids found in node "Test Node": "shared-id"/)
  })

  test('rejects duplicate requiredInputs entries', () => {
    const definition = createDefinition({
      outputs: Some([createOutputDefinition('outputA', ['inputA', 'inputA'])]),
    })
    const registry = createRegistry(definition)

    expect(() => buildNodeInstance(registry, createNodeData())).toThrow(/Duplicate requiredInputs found in output port "outputA" of node "Test Node": "inputA"/)
  })

  test('rejects requiredInputs when the node has no inputs', () => {
    const definition = createDefinition({
      inputs: None,
      outputs: Some([createOutputDefinition('outputA', ['inputA'])]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      inputs: None,
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Output port "outputA" in node "Test Node" declares requiredInputs, but the node has no inputs/)
  })

  test('rejects requiredInputs that point to missing inputs', () => {
    const definition = createDefinition({
      outputs: Some([createOutputDefinition('outputA', ['missingInput'])]),
    })
    const registry = createRegistry(definition)

    expect(() => buildNodeInstance(registry, createNodeData())).toThrow(
      /Output port "outputA" in node "Test Node" references missing requiredInputs: "missingInput"/
    )
  })
})
