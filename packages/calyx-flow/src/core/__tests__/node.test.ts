import { buildNodeInputPortInstance, buildNodeInstance, buildNodeOutputPortInstance, buildNodeParameterInstance } from '@/core/node.ts'
import { NodeRegistry } from '@/core/registry.ts'
import type { NodeData, NodeDefinition, NodeExecutor, NodeInputPortDefinition, NodeOutputPortDefinition, NodeParameterDefinition, Option } from '@/types'
import { None, Some } from '@/utils/structure.ts'
import { describe, expect, test } from 'bun:test'
import { isEmpty } from 'radash'
import z from 'zod'

const registryKey = 'demo/test'

const executor: NodeExecutor = async () => ({ continue: true, data: null })

function createParameterDefinition(name: string, schema: z.ZodType = z.string(), overrides: Partial<NodeParameterDefinition> = {}): NodeParameterDefinition {
  return {
    name,
    description: `Parameter ${name}`,
    schema,
    ...overrides,
  }
}

function createParameterData(name: string, value: Option<unknown> = Some('value')) {
  return {
    name,
    value,
  }
}

function createInputDefinition(name: string, overrides: Partial<NodeInputPortDefinition> = {}): NodeInputPortDefinition {
  return {
    name,
    description: `Input ${name}`,
    schema: z.string(),
    postCompile: None,
    ...overrides,
  }
}

function createInputData(id: string, name: string) {
  return {
    id,
    name,
  }
}

function createOutputDefinition(
  name: string,
  requiredInputs: string[] = ['inputA'],
  overrides: Partial<NodeOutputPortDefinition> = {}
): NodeOutputPortDefinition {
  return {
    name,
    description: `Output ${name}`,
    schema: z.string(),
    requiredInputs: requiredInputs.length > 0 ? Some(requiredInputs) : None,
    executor,
    postCompile: None,
    ...overrides,
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

describe('buildNodeParameterInstance', () => {
  test('builds a parameter instance with parsed Some value', () => {
    const definition = createParameterDefinition('threshold', z.coerce.number())
    const instance = buildNodeParameterInstance(definition, createParameterData('threshold', Some('42')))

    expect(instance.name).toBe('threshold')
    expect(instance.description).toBe('Parameter threshold')
    expect(instance.schema).toBe(definition.schema)
    expect(instance.value).toEqual(Some(42))
  })

  test('builds a parameter instance with None value', () => {
    const definition = createParameterDefinition('threshold', z.number())
    const instance = buildNodeParameterInstance(definition, createParameterData('threshold', None))

    expect(instance.value).toEqual(None)
  })

  test('rejects invalid parameter data', () => {
    const definition = createParameterDefinition('threshold', z.number())

    expect(() => buildNodeParameterInstance(definition, { name: 'threshold' })).toThrow(/Invalid parameter data for parameter "threshold":/)
  })

  test('rejects parameter values that fail the definition schema', () => {
    const definition = createParameterDefinition('threshold', z.number())

    expect(() => buildNodeParameterInstance(definition, createParameterData('threshold', Some('not-a-number')))).toThrow(
      /Invalid parameter value for parameter "threshold":/
    )
  })

  test('rejects parameter name mismatch', () => {
    const definition = createParameterDefinition('threshold', z.number())

    expect(() => buildNodeParameterInstance(definition, createParameterData('limit', Some(1)))).toThrow(
      /Parameter name mismatch: expected "threshold", got "limit"/
    )
  })
})

describe('buildNodeInputPortInstance', () => {
  test('builds an input port instance with defaults when postCompile is absent', () => {
    const definition = createInputDefinition('inputA')
    const instance = buildNodeInputPortInstance(definition, createInputData('input-id-1', 'inputA'))

    expect(instance).toEqual({
      id: 'input-id-1',
      name: 'inputA',
      description: 'Input inputA',
      schema: definition.schema,
      used: false,
      value: None,
    })
  })

  test('applies postCompile to input port instances', () => {
    const definition = createInputDefinition('inputA', {
      postCompile: Some((origin) => ({
        ...origin,
        used: true,
        value: Some('hydrated'),
      })),
    })

    const instance = buildNodeInputPortInstance(definition, createInputData('input-id-1', 'inputA'))

    expect(instance.used).toBe(true)
    expect(instance.value).toEqual(Some('hydrated'))
  })

  test('rejects invalid input port data', () => {
    const definition = createInputDefinition('inputA')

    expect(() => buildNodeInputPortInstance(definition, { name: 'inputA' })).toThrow(/Invalid input port data for input port "inputA":/)
  })

  test('rejects input port name mismatch', () => {
    const definition = createInputDefinition('inputA')

    expect(() => buildNodeInputPortInstance(definition, createInputData('input-id-1', 'inputB'))).toThrow(
      /Input port name mismatch: expected "inputA", got "inputB"/
    )
  })

  test('rejects invalid input port instances returned by postCompile', () => {
    const definition = createInputDefinition('inputA', {
      postCompile: Some((origin) => {
        const mutated = { ...origin }
        Reflect.deleteProperty(mutated, 'id')
        return mutated
      }),
    })

    expect(() => buildNodeInputPortInstance(definition, createInputData('input-id-1', 'inputA'))).toThrow(
      /Invalid input port instance after postCompile for input port "inputA":/
    )
  })
})

describe('buildNodeOutputPortInstance', () => {
  test('builds an output port instance with defaults when postCompile is absent', () => {
    const definition = createOutputDefinition('outputA')
    const instance = buildNodeOutputPortInstance(definition, createOutputData('output-id-1', 'outputA'))

    expect(instance).toEqual({
      id: 'output-id-1',
      name: 'outputA',
      description: 'Output outputA',
      schema: definition.schema,
      used: false,
      value: None,
      requiredInputs: Some(['inputA']),
      executor,
    })
  })

  test('applies postCompile to output port instances', () => {
    const definition = createOutputDefinition('outputA', ['inputA'], {
      postCompile: Some((origin) => ({
        ...origin,
        used: true,
        value: Some('done'),
      })),
    })

    const instance = buildNodeOutputPortInstance(definition, createOutputData('output-id-1', 'outputA'))

    expect(instance.used).toBe(true)
    expect(instance.value).toEqual(Some('done'))
    expect(instance.requiredInputs).toEqual(Some(['inputA']))
  })

  test('rejects invalid output port data', () => {
    const definition = createOutputDefinition('outputA')

    expect(() => buildNodeOutputPortInstance(definition, { name: 'outputA' })).toThrow(/Invalid output port data for output port "outputA":/)
  })

  test('rejects output port name mismatch', () => {
    const definition = createOutputDefinition('outputA')

    expect(() => buildNodeOutputPortInstance(definition, createOutputData('output-id-1', 'outputB'))).toThrow(
      /Output port name mismatch: expected "outputA", got "outputB"/
    )
  })

  test('rejects invalid output port instances returned by postCompile', () => {
    const definition = createOutputDefinition('outputA', ['inputA'], {
      postCompile: Some((origin) => {
        const mutated = { ...origin }
        Reflect.deleteProperty(mutated, 'id')
        return mutated
      }),
    })

    expect(() => buildNodeOutputPortInstance(definition, createOutputData('output-id-1', 'outputA'))).toThrow(
      /Invalid output port instance after postCompile for output port "outputA":/
    )
  })
})

describe('buildNodeInstance', () => {
  test('builds a valid full node instance', () => {
    const definition = createDefinition({
      parameters: Some([createParameterDefinition('threshold', z.coerce.number())]),
      inputs: Some([
        createInputDefinition('inputA', {
          postCompile: Some((origin) => ({
            ...origin,
            used: true,
            value: Some('hydrated-input'),
          })),
        }),
      ]),
      outputs: Some([
        createOutputDefinition('outputA', ['inputA'], {
          postCompile: Some((origin) => ({
            ...origin,
            used: true,
            value: Some('hydrated-output'),
          })),
        }),
      ]),
    })
    const registry = createRegistry(definition)
    const instance = buildNodeInstance(
      registry,
      createNodeData({
        parameters: Some([createParameterData('threshold', Some('7'))]),
      })
    )

    expect(instance.id).toBe('node-1')
    expect(instance.name).toBe('Test Node')
    expect(instance.position).toEqual({ x: 0, y: 0 })
    expect(instance.description).toBe('Node used in tests')
    expect(instance.type).toEqual(['test'])
    expect(instance.docs).toBe('docs')
    expect(instance.group).toBe('group')

    expect(instance.parameters.type).toBe('Some')
    if (instance.parameters.type === 'Some') {
      expect(instance.parameters.value).toHaveLength(1)
      expect(instance.parameters.value[0]?.value).toEqual(Some(7))
    }

    expect(instance.inputs.type).toBe('Some')
    if (instance.inputs.type === 'Some') {
      expect(instance.inputs.value).toHaveLength(1)
      expect(instance.inputs.value[0]?.used).toBe(true)
      expect(instance.inputs.value[0]?.value).toEqual(Some('hydrated-input'))
    }

    expect(instance.outputs.type).toBe('Some')
    if (instance.outputs.type === 'Some') {
      expect(instance.outputs.value).toHaveLength(1)
      expect(instance.outputs.value[0]?.used).toBe(true)
      expect(instance.outputs.value[0]?.value).toEqual(Some('hydrated-output'))
      expect(instance.outputs.value[0]?.requiredInputs).toEqual(Some(['inputA']))
      expect(instance.outputs.value[0]?.executor).toBe(executor)
    }
  })

  test('builds a minimal node instance when parameters inputs and outputs are None', () => {
    const registry = createRegistry(
      createDefinition({
        parameters: None,
        inputs: None,
        outputs: None,
      })
    )

    const instance = buildNodeInstance(
      registry,
      createNodeData({
        parameters: None,
        inputs: None,
        outputs: None,
      })
    )

    expect(instance.parameters).toEqual(None)
    expect(instance.inputs).toEqual(None)
    expect(instance.outputs).toEqual(None)
  })

  test('rejects invalid node instance data', () => {
    const registry = createRegistry(createDefinition())

    expect(() => buildNodeInstance(registry, { key: registryKey, name: 'Test Node' })).toThrow(/Invalid node instance data:/)
  })

  test('rejects missing registry definitions', () => {
    const registry = new NodeRegistry()

    expect(() => buildNodeInstance(registry, createNodeData())).toThrow(/Node definition not found for key: demo\/test/)
  })

  test('rejects node name mismatch', () => {
    const registry = createRegistry(createDefinition({ name: 'Definition Name' }))

    expect(() => buildNodeInstance(registry, createNodeData({ name: 'Data Name' }))).toThrow(/Node name mismatch: expected "Definition Name", got "Data Name"/)
  })

  test('rejects duplicate parameter definition names', () => {
    const definition = createDefinition({
      parameters: Some([createParameterDefinition('threshold', z.number()), createParameterDefinition('threshold', z.number())]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      parameters: Some([createParameterData('threshold', Some(1)), createParameterData('threshold', Some(2))]),
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Duplicate parameter definition names found in node "Test Node": "threshold"/)
  })

  test('rejects duplicate input port definition names', () => {
    const definition = createDefinition({
      inputs: Some([createInputDefinition('inputA'), createInputDefinition('inputA')]),
    })
    const registry = createRegistry(definition)

    expect(() => buildNodeInstance(registry, createNodeData())).toThrow(/Duplicate input port definition names found in node "Test Node": "inputA"/)
  })

  test('rejects duplicate output port definition names', () => {
    const definition = createDefinition({
      outputs: Some([createOutputDefinition('outputA', ['inputA']), createOutputDefinition('outputA', ['inputA'])]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      outputs: Some([createOutputData('output-id-1', 'outputA'), createOutputData('output-id-2', 'outputA')]),
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Duplicate output port definition names found in node "Test Node": "outputA"/)
  })

  test('rejects duplicate parameter data names', () => {
    const definition = createDefinition({
      parameters: Some([createParameterDefinition('threshold', z.number()), createParameterDefinition('limit', z.number())]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      parameters: Some([createParameterData('threshold', Some(1)), createParameterData('threshold', Some(2))]),
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Duplicate parameter data names found in node "Test Node": "threshold"/)
  })

  test('rejects duplicate input port data names', () => {
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

  test('rejects duplicate output port data names', () => {
    const definition = createDefinition({
      outputs: Some([createOutputDefinition('outputA', ['inputA']), createOutputDefinition('outputB', ['inputA'])]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      outputs: Some([createOutputData('output-id-1', 'outputA'), createOutputData('output-id-2', 'outputA')]),
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Duplicate output port data names found in node "Test Node": "outputA"/)
  })

  test('rejects missing parameters data when the definition declares parameters', () => {
    const definition = createDefinition({
      parameters: Some([createParameterDefinition('threshold', z.number())]),
    })
    const registry = createRegistry(definition)

    expect(() => buildNodeInstance(registry, createNodeData({ parameters: None }))).toThrow(/Node parameters data is missing for node "Test Node"/)
  })

  test('rejects missing parameter data entries', () => {
    const definition = createDefinition({
      parameters: Some([createParameterDefinition('threshold', z.number()), createParameterDefinition('limit', z.number())]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      parameters: Some([createParameterData('threshold', Some(1))]),
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Parameter data not found for parameter "limit" in node "Test Node"/)
  })

  test('propagates invalid parameter values', () => {
    const definition = createDefinition({
      parameters: Some([createParameterDefinition('threshold', z.number())]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      parameters: Some([createParameterData('threshold', Some('bad-value'))]),
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Invalid parameter value for parameter "threshold":/)
  })

  test('rejects missing inputs data when the definition declares inputs', () => {
    const registry = createRegistry(createDefinition())

    expect(() => buildNodeInstance(registry, createNodeData({ inputs: None }))).toThrow(/Node inputs data is missing for node "Test Node"/)
  })

  test('rejects missing input data entries', () => {
    const definition = createDefinition({
      inputs: Some([createInputDefinition('inputA'), createInputDefinition('inputB')]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      inputs: Some([createInputData('input-id-1', 'inputA')]),
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Input port data not found for input port "inputB" in node "Test Node"/)
  })

  test('propagates invalid input postCompile results', () => {
    const definition = createDefinition({
      inputs: Some([
        createInputDefinition('inputA', {
          postCompile: Some((origin) => {
            const mutated = { ...origin }
            Reflect.deleteProperty(mutated, 'id')
            return mutated
          }),
        }),
      ]),
    })
    const registry = createRegistry(definition)

    expect(() => buildNodeInstance(registry, createNodeData())).toThrow(/Invalid input port instance after postCompile for input port "inputA":/)
  })

  test('rejects duplicate input port ids', () => {
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

  test('rejects duplicate output port ids', () => {
    const definition = createDefinition({
      outputs: Some([createOutputDefinition('outputA', ['inputA']), createOutputDefinition('outputB', ['inputA'])]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      outputs: Some([createOutputData('shared-output-id', 'outputA'), createOutputData('shared-output-id', 'outputB')]),
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Duplicate output port ids found in node "Test Node": "shared-output-id"/)
  })

  test('rejects missing outputs data when the definition declares outputs', () => {
    const registry = createRegistry(createDefinition())

    expect(() => buildNodeInstance(registry, createNodeData({ outputs: None }))).toThrow(/Node outputs data is missing for node "Test Node"/)
  })

  test('rejects missing output data entries', () => {
    const definition = createDefinition({
      outputs: Some([createOutputDefinition('outputA', ['inputA']), createOutputDefinition('outputB', ['inputA'])]),
    })
    const registry = createRegistry(definition)
    const nodeData = createNodeData({
      outputs: Some([createOutputData('output-id-1', 'outputA')]),
    })

    expect(() => buildNodeInstance(registry, nodeData)).toThrow(/Output port data not found for output port "outputB" in node "Test Node"/)
  })

  test('propagates invalid output postCompile results', () => {
    const definition = createDefinition({
      outputs: Some([
        createOutputDefinition('outputA', ['inputA'], {
          postCompile: Some((origin) => {
            const mutated = { ...origin }
            Reflect.deleteProperty(mutated, 'id')
            return mutated
          }),
        }),
      ]),
    })
    const registry = createRegistry(definition)

    expect(() => buildNodeInstance(registry, createNodeData())).toThrow(/Invalid output port instance after postCompile for output port "outputA":/)
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
