import { createNodeBuilder, createNodeInputPortBuilder, createNodeOutputPortBuilder, createNodeParameterBuilder } from '@/core/node.ts'
import { NodeRegistry } from '@/core/registry.ts'
import type { NodeDefinition, Option } from '@/types'
import { beforeEach, describe, expect, it } from 'bun:test'

// Helper to safely extract value from Option in tests
function getSomeValue<T>(option: Option<T>): T {
  if (option.type === 'None') {
    throw new Error('Expected Some but got None')
  }
  return option.value
}

describe('createNodeParameterBuilder', () => {
  it('should build a basic parameter with required fields', () => {
    const parameter = createNodeParameterBuilder().setName('testParam').setDescription('A test parameter').setSchema({ type: 'string' }).build()

    expect(parameter.name).toBe('testParam')
    expect(parameter.description).toBe('A test parameter')
    expect(parameter.value.type).toBe('None')
  })

  it('should build a parameter with all properties using setters', () => {
    const parameter = createNodeParameterBuilder()
      .setName('testParam')
      .setDescription('A test parameter')
      .setSchema({ type: 'string' })
      .setValue('testValue')
      .build()

    expect(parameter.name).toBe('testParam')
    expect(parameter.description).toBe('A test parameter')
    expect(parameter.value.type).toBe('Some')
    expect(getSomeValue(parameter.value)).toBe('testValue')
  })

  it('should build a parameter from an object', () => {
    const obj = {
      name: 'fromObj',
      description: 'Created from object',
      schema: { type: 'number' },
      value: 42,
    }

    const parameter = createNodeParameterBuilder().from(obj).build()

    expect(parameter.name).toBe('fromObj')
    expect(parameter.description).toBe('Created from object')
    expect(parameter.value.type).toBe('Some')
    expect(getSomeValue(parameter.value)).toBe(42)
  })

  it('should support method chaining after from()', () => {
    const obj = {
      name: 'original',
      description: 'Original desc',
      schema: { type: 'string' },
    }

    const parameter = createNodeParameterBuilder().from(obj).setName('modified').setDescription('Modified after from').build()

    expect(parameter.name).toBe('modified')
    expect(parameter.description).toBe('Modified after from')
  })

  it('should throw error for invalid schema in from()', () => {
    const obj = {
      name: 'test',
      description: 'Test desc',
      schema: 'not-a-valid-schema', // schema should be an object
    }

    expect(() => createNodeParameterBuilder().from(obj).build()).toThrow()
  })

  it('should throw error when value does not match schema', () => {
    expect(() =>
      createNodeParameterBuilder().setName('test').setDescription('Test desc').setSchema({ type: 'number' }).setValue('not-a-number').build()
    ).toThrow(/Invalid NodeParameter value/)
  })

  it('should handle initial data in constructor', () => {
    const parameter = createNodeParameterBuilder({
      name: 'initialName',
      description: 'Initial description',
      schema: { type: 'boolean' },
      value: true,
    }).build()

    expect(parameter.name).toBe('initialName')
    expect(parameter.description).toBe('Initial description')
    expect(parameter.value.type).toBe('Some')
    expect(getSomeValue(parameter.value)).toBe(true)
  })

  it('should handle null value as None', () => {
    const parameter = createNodeParameterBuilder()
      .setName('test')
      .setDescription('Test desc')
      .setSchema({ type: 'string' })
      .setValue(null as unknown as string)
      .build()

    expect(parameter.value.type).toBe('None')
  })

  it('should handle undefined value as None', () => {
    const parameter = createNodeParameterBuilder().setName('test').setDescription('Test desc').setSchema({ type: 'string' }).setValue(undefined).build()

    expect(parameter.value.type).toBe('None')
  })

  it('should validate string schema correctly', () => {
    const parameter = createNodeParameterBuilder()
      .setName('strParam')
      .setDescription('String param')
      .setSchema({ type: 'string', minLength: 3 })
      .setValue('hello')
      .build()

    expect(getSomeValue(parameter.value)).toBe('hello')
  })

  it('should validate minLength constraint', () => {
    expect(() =>
      createNodeParameterBuilder().setName('test').setDescription('Test desc').setSchema({ type: 'string', minLength: 5 }).setValue('hi').build()
    ).toThrow(/Invalid NodeParameter value/)
  })

  it('should validate array schema correctly', () => {
    const parameter = createNodeParameterBuilder()
      .setName('arrParam')
      .setDescription('Array param')
      .setSchema({ type: 'array', items: { type: 'number' } })
      .setValue([1, 2, 3])
      .build()

    expect(getSomeValue(parameter.value)).toEqual([1, 2, 3])
  })

  it('should validate object schema correctly', () => {
    const parameter = createNodeParameterBuilder()
      .setName('objParam')
      .setDescription('Object param')
      .setSchema({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      })
      .setValue({ name: 'John', age: 30 })
      .build()

    expect(getSomeValue(parameter.value)).toEqual({ name: 'John', age: 30 })
  })

  it('should support complex nested schemas', () => {
    const schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
        count: { type: 'number' },
      },
    }

    const parameter = createNodeParameterBuilder()
      .setName('complex')
      .setDescription('Complex param')
      .setSchema(schema)
      .setValue({ items: ['a', 'b'], count: 2 })
      .build()

    expect(parameter.value.type).toBe('Some')
  })
})

describe('createNodeInputPortBuilder', () => {
  it('should build a basic input port with required fields', () => {
    const port = createNodeInputPortBuilder().setId('input1').setName('inputPort').setDescription('An input port').setSchema({ type: 'string' }).build()

    expect(port.id).toBe('input1')
    expect(port.name).toBe('inputPort')
    expect(port.description).toBe('An input port')
    expect(port.value.type).toBe('None')
  })

  it('should build an input port with all properties', () => {
    const port = createNodeInputPortBuilder()
      .setId('input1')
      .setName('inputPort')
      .setDescription('An input port')
      .setSchema({ type: 'string', minLength: 1 })
      .setValue('hello')
      .build()

    expect(port.id).toBe('input1')
    expect(port.name).toBe('inputPort')
    expect(port.description).toBe('An input port')
    expect(port.value.type).toBe('Some')
    expect(getSomeValue(port.value)).toBe('hello')
  })

  it('should build an input port from an object', () => {
    const obj = {
      id: 'fromObj',
      name: 'objPort',
      description: 'From object',
      schema: { type: 'number' },
      value: 100,
    }

    const port = createNodeInputPortBuilder().from(obj).build()

    expect(port.id).toBe('fromObj')
    expect(port.name).toBe('objPort')
    expect(port.value.type).toBe('Some')
    expect(getSomeValue(port.value)).toBe(100)
  })

  it('should validate value against schema', () => {
    expect(() =>
      createNodeInputPortBuilder().setId('test').setName('test').setDescription('Test desc').setSchema({ type: 'boolean' }).setValue('not-boolean').build()
    ).toThrow(/Invalid NodeInputPort value/)
  })

  it('should handle null value as None', () => {
    const port = createNodeInputPortBuilder()
      .setId('test')
      .setName('test')
      .setDescription('Test desc')
      .setSchema({ type: 'string' })
      .setValue(null as unknown as string)
      .build()

    expect(port.value.type).toBe('None')
  })

  it('should support chaining multiple setters', () => {
    const port = createNodeInputPortBuilder()
      .setId('chain')
      .setName('chainName')
      .setDescription('chainDesc')
      .setSchema({ type: 'array' })
      .setValue([1, 2, 3])
      .build()

    expect(port.id).toBe('chain')
    expect(port.name).toBe('chainName')
    expect(port.description).toBe('chainDesc')
    expect(getSomeValue(port.value)).toEqual([1, 2, 3])
  })

  it('should validate number constraints', () => {
    expect(() =>
      createNodeInputPortBuilder()
        .setId('test')
        .setName('test')
        .setDescription('Test desc')
        .setSchema({ type: 'number', minimum: 0, maximum: 100 })
        .setValue(150)
        .build()
    ).toThrow(/Invalid NodeInputPort value/)
  })

  it('should validate enum values', () => {
    const port = createNodeInputPortBuilder()
      .setId('test')
      .setName('test')
      .setDescription('Test desc')
      .setSchema({ type: 'string', enum: ['a', 'b', 'c'] })
      .setValue('b')
      .build()

    expect(getSomeValue(port.value)).toBe('b')
  })

  it('should reject invalid enum values', () => {
    expect(() =>
      createNodeInputPortBuilder()
        .setId('test')
        .setName('test')
        .setDescription('Test desc')
        .setSchema({ type: 'string', enum: ['a', 'b'] })
        .setValue('c')
        .build()
    ).toThrow(/Invalid NodeInputPort value/)
  })
})

describe('createNodeOutputPortBuilder', () => {
  it('should build a basic output port with required fields', () => {
    const port = createNodeOutputPortBuilder().setId('output1').setName('outputPort').setDescription('An output port').setSchema({ type: 'string' }).build()

    expect(port.id).toBe('output1')
    expect(port.name).toBe('outputPort')
    expect(port.description).toBe('An output port')
    expect(port.value.type).toBe('None')
    expect(port.requiredInputs.type).toBe('None')
  })

  it('should build an output port with all properties', () => {
    const port = createNodeOutputPortBuilder()
      .setId('output1')
      .setName('outputPort')
      .setDescription('An output port')
      .setSchema({ type: 'object' })
      .setValue({ key: 'value' })
      .setRequiredInputs(['input1', 'input2'])
      .build()

    expect(port.id).toBe('output1')
    expect(port.name).toBe('outputPort')
    expect(port.description).toBe('An output port')
    expect(port.value.type).toBe('Some')
    expect(getSomeValue(port.value)).toEqual({ key: 'value' })
    expect(port.requiredInputs.type).toBe('Some')
    expect(getSomeValue(port.requiredInputs)).toEqual(['input1', 'input2'])
  })

  it('should build an output port from an object', () => {
    const obj = {
      id: 'objOut',
      name: 'objOutput',
      description: 'From object',
      schema: { type: 'string' },
      requiredInputs: ['req1'],
    }

    const port = createNodeOutputPortBuilder().from(obj).build()

    expect(port.id).toBe('objOut')
    expect(port.name).toBe('objOutput')
    expect(port.requiredInputs.type).toBe('Some')
    expect(getSomeValue(port.requiredInputs)).toEqual(['req1'])
  })

  it('should validate value against schema', () => {
    expect(() =>
      createNodeOutputPortBuilder().setId('test').setName('test').setDescription('Test desc').setSchema({ type: 'number', minimum: 0 }).setValue(-5).build()
    ).toThrow(/Invalid NodeOutputPort value/)
  })

  it('should handle undefined requiredInputs as None', () => {
    const port = createNodeOutputPortBuilder().setId('test').setName('test').setDescription('Test desc').setSchema({ type: 'string' }).build()

    expect(port.requiredInputs.type).toBe('None')
  })

  it('should handle empty requiredInputs array', () => {
    const port = createNodeOutputPortBuilder()
      .setId('test')
      .setName('test')
      .setDescription('Test desc')
      .setSchema({ type: 'string' })
      .setRequiredInputs([])
      .build()

    expect(port.requiredInputs.type).toBe('Some')
    expect(getSomeValue(port.requiredInputs)).toEqual([])
  })

  it('should support null value', () => {
    const port = createNodeOutputPortBuilder()
      .setId('test')
      .setName('test')
      .setDescription('Test desc')
      .setSchema({ type: 'string' })
      .setValue(null as unknown as string)
      .build()

    expect(port.value.type).toBe('None')
  })

  it('should validate array items schema', () => {
    const port = createNodeOutputPortBuilder()
      .setId('test')
      .setName('test')
      .setDescription('Test desc')
      .setSchema({
        type: 'array',
        items: { type: 'number' },
      })
      .setValue([1, 2, 3])
      .build()

    expect(getSomeValue(port.value)).toEqual([1, 2, 3])
  })

  it('should reject invalid array items', () => {
    expect(() =>
      createNodeOutputPortBuilder()
        .setId('test')
        .setName('test')
        .setDescription('Test desc')
        .setSchema({
          type: 'array',
          items: { type: 'string' },
        })
        .setValue([1, 2, 3])
        .build()
    ).toThrow(/Invalid NodeOutputPort value/)
  })
})

describe('createNodeBuilder', () => {
  let registry: NodeRegistry

  beforeEach(() => {
    registry = new NodeRegistry()
  })

  const createTestDefinition = (name: string): NodeDefinition => ({
    name,
    description: `Description for ${name}`,
    docs: `# ${name}\nDocumentation`,
    group: 'test-group',
    parameters: { type: 'None' },
    inputs: { type: 'None' },
    outputs: { type: 'None' },
    executors: [],
  })

  it('should throw error when registry is not set', () => {
    expect(() => createNodeBuilder().setId('node1').setKey('test/node').setName('Test Node').build()).toThrow('NodeRegistry is required')
  })

  it('should throw error when key is not set', () => {
    expect(() => createNodeBuilder().setId('node1').setRegistry(registry).build()).toThrow('Node key is required')
  })

  it('should throw error when key is not found in registry', () => {
    expect(() => createNodeBuilder().setId('node1').setKey('nonexistent/node').setRegistry(registry).build()).toThrow('Node definition not found')
  })

  it('should throw error when id is not set', () => {
    registry.register('test/node', createTestDefinition('TestNode'))

    expect(() => createNodeBuilder().setKey('test/node').setRegistry(registry).build()).toThrow('Node id is required')
  })

  it('should build a basic node from registry', () => {
    registry.register('test/node', createTestDefinition('TestNode'))

    const node = createNodeBuilder().setId('node1').setKey('test/node').setRegistry(registry).build()

    expect(node.id).toBe('node1')
    expect(node.name).toBe('TestNode')
    expect(node.description).toBe('Description for TestNode')
    expect(node.docs).toBe('# TestNode\nDocumentation')
    expect(node.runningTimes).toBe(0)
    expect(node.group).toBe('test-group')
    expect(node.parameters.type).toBe('None')
    expect(node.inputs.type).toBe('None')
    expect(node.outputs.type).toBe('None')
    expect(node.executors).toEqual([])
  })

  it('should use custom name when provided', () => {
    registry.register('test/node', createTestDefinition('OriginalName'))

    const node = createNodeBuilder().setId('node1').setKey('test/node').setName('CustomName').setRegistry(registry).build()

    expect(node.name).toBe('CustomName')
  })

  it('should build node with parameters', () => {
    registry.register('test/node', createTestDefinition('TestNode'))

    const node = createNodeBuilder()
      .setId('node1')
      .setKey('test/node')
      .setRegistry(registry)
      .setParameters([
        {
          name: 'param1',
          description: 'Parameter 1',
          schema: { type: 'string' },
          value: 'value1',
        },
      ])
      .build()

    expect(node.parameters.type).toBe('Some')
    if (node.parameters.type === 'Some') {
      expect(node.parameters.value.length).toBe(1)
      const param = node.parameters.value[0]!
      expect(param.name).toBe('param1')
      expect(param.value.type).toBe('Some')
      expect(getSomeValue(param.value)).toBe('value1')
    }
  })

  it('should build node with inputs', () => {
    registry.register('test/node', createTestDefinition('TestNode'))

    const node = createNodeBuilder()
      .setId('node1')
      .setKey('test/node')
      .setRegistry(registry)
      .setInputs([
        {
          id: 'in1',
          name: 'input1',
          description: 'Input 1',
          schema: { type: 'number' },
          value: 42,
        },
      ])
      .build()

    expect(node.inputs.type).toBe('Some')
    if (node.inputs.type === 'Some') {
      expect(node.inputs.value.length).toBe(1)
      const input = node.inputs.value[0]!
      expect(input.id).toBe('in1')
      expect(input.value.type).toBe('Some')
      expect(getSomeValue(input.value)).toBe(42)
    }
  })

  it('should build node with outputs', () => {
    registry.register('test/node', createTestDefinition('TestNode'))

    const node = createNodeBuilder()
      .setId('node1')
      .setKey('test/node')
      .setRegistry(registry)
      .setOutputs([
        {
          id: 'out1',
          name: 'output1',
          description: 'Output 1',
          schema: { type: 'boolean' },
          value: true,
          requiredInputs: ['in1'],
        },
      ])
      .build()

    expect(node.outputs.type).toBe('Some')
    if (node.outputs.type === 'Some') {
      expect(node.outputs.value.length).toBe(1)
      const output = node.outputs.value[0]!
      expect(output.id).toBe('out1')
      expect(output.value.type).toBe('Some')
      expect(getSomeValue(output.value)).toBe(true)
      expect(output.requiredInputs.type).toBe('Some')
      expect(getSomeValue(output.requiredInputs)).toEqual(['in1'])
    }
  })

  it('should build node from an object', () => {
    registry.register('test/node', createTestDefinition('TestNode'))

    const obj = {
      id: 'nodeFromObj',
      key: 'test/node' as const,
      name: 'FromObject',
      parameters: [
        {
          name: 'p1',
          description: 'P1',
          schema: { type: 'string' },
        },
      ],
    }

    const node = createNodeBuilder().from(obj).setRegistry(registry).build()

    expect(node.id).toBe('nodeFromObj')
    expect(node.name).toBe('FromObject')
    expect(node.parameters.type).toBe('Some')
  })

  it('should throw error for invalid object in from()', () => {
    expect(() => createNodeBuilder().from({ invalid: 'object' }).setRegistry(registry).build()).toThrow('Invalid NodeData')
  })

  it('should handle empty parameters, inputs, and outputs arrays', () => {
    registry.register('test/node', createTestDefinition('TestNode'))

    const node = createNodeBuilder().setId('node1').setKey('test/node').setRegistry(registry).setParameters([]).setInputs([]).setOutputs([]).build()

    expect(node.parameters.type).toBe('None')
    expect(node.inputs.type).toBe('None')
    expect(node.outputs.type).toBe('None')
  })

  it('should support method chaining', () => {
    registry.register('chain/test', createTestDefinition('ChainNode'))

    const node = createNodeBuilder()
      .setId('chain1')
      .setKey('chain/test')
      .setName('ChainName')
      .setParameters([{ name: 'p1', description: 'P1', schema: { type: 'string' } }])
      .setRegistry(registry)
      .build()

    expect(node.id).toBe('chain1')
    expect(node.name).toBe('ChainName')
  })

  it('should preserve executors from definition', () => {
    const executor = {
      outputName: 'result',
      used: false,
      func: async () => ({
        continue: true,
        data: 'result',
      }),
    }

    const definition: NodeDefinition = {
      ...createTestDefinition('TestNode'),
      executors: [executor],
    }

    registry.register('test/node', definition)

    const node = createNodeBuilder().setId('node1').setKey('test/node').setRegistry(registry).build()

    expect(node.executors).toHaveLength(1)
    expect(node.executors[0]!.outputName).toBe('result')
  })

  it('should initialize with partial data', () => {
    registry.register('init/test', createTestDefinition('InitNode'))

    const node = createNodeBuilder({
      id: 'initId',
      key: 'init/test',
      name: 'InitName',
    })
      .setRegistry(registry)
      .build()

    expect(node.id).toBe('initId')
    expect(node.name).toBe('InitName')
  })

  it('should handle multiple parameters', () => {
    registry.register('test/node', createTestDefinition('TestNode'))

    const node = createNodeBuilder()
      .setId('node1')
      .setKey('test/node')
      .setRegistry(registry)
      .setParameters([
        { name: 'p1', description: 'P1', schema: { type: 'string' }, value: 'v1' },
        { name: 'p2', description: 'P2', schema: { type: 'number' }, value: 42 },
        { name: 'p3', description: 'P3', schema: { type: 'boolean' }, value: true },
      ])
      .build()

    expect(node.parameters.type).toBe('Some')
    if (node.parameters.type === 'Some') {
      expect(node.parameters.value.length).toBe(3)
      expect(node.parameters.value[0]!.name).toBe('p1')
      expect(node.parameters.value[1]!.name).toBe('p2')
      expect(node.parameters.value[2]!.name).toBe('p3')
    }
  })

  it('should handle multiple inputs and outputs', () => {
    registry.register('test/node', createTestDefinition('TestNode'))

    const node = createNodeBuilder()
      .setId('node1')
      .setKey('test/node')
      .setRegistry(registry)
      .setInputs([
        { id: 'in1', name: 'input1', description: 'Input 1', schema: { type: 'string' } },
        { id: 'in2', name: 'input2', description: 'Input 2', schema: { type: 'number' } },
      ])
      .setOutputs([
        { id: 'out1', name: 'output1', description: 'Output 1', schema: { type: 'boolean' } },
        { id: 'out2', name: 'output2', description: 'Output 2', schema: { type: 'array' } },
      ])
      .build()

    if (node.inputs.type === 'Some') {
      expect(node.inputs.value.length).toBe(2)
    }
    if (node.outputs.type === 'Some') {
      expect(node.outputs.value.length).toBe(2)
    }
  })

  it('should get description and docs from definition', () => {
    const definition: NodeDefinition = {
      ...createTestDefinition('TestNode'),
      description: 'Custom description',
      docs: '## Custom Docs',
    }

    registry.register('test/node', definition)

    const node = createNodeBuilder().setId('node1').setKey('test/node').setRegistry(registry).build()

    expect(node.description).toBe('Custom description')
    expect(node.docs).toBe('## Custom Docs')
  })
})
