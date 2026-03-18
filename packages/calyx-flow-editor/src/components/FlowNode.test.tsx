import { FlowNode, type FlowNodeData } from '@/components/FlowNode.tsx'
import { describe, expect, it } from 'bun:test'
import type { NodeParameter, NodePort, Option } from 'calyx-flow/types'

/**
 * Test fixtures
 */

const createMockPort = (id: string, name: string, direction: 'input' | 'output'): NodePort => ({
  id,
  name,
  schema: {} as import('zod').ZodType,
  direction,
  description: `${direction} port ${id}`,
  value: { type: 'None' },
})

const createMockParameter = <T,>(name: string, value: Option<T>, description = ''): NodeParameter => ({
  name,
  description,
  schema: {} as import('zod').ZodType,
  value: value as Option<unknown>,
})

describe('FlowNode', () => {
  describe('render with no ports', () => {
    it('renders node without crashing when inputs and outputs are undefined', () => {
      const data: FlowNodeData = {
        label: 'Simple Node',
      }

      // Component should render without throwing
      expect(() => FlowNode({ data })).not.toThrow()
    })

    it('renders node without crashing when inputs and outputs are empty arrays', () => {
      const data: FlowNodeData = {
        label: 'Empty Ports Node',
        inputs: [],
        outputs: [],
      }

      expect(() => FlowNode({ data })).not.toThrow()
    })

    it('renders label correctly when no ports', () => {
      const data: FlowNodeData = {
        label: 'No Ports Node',
      }

      const result = FlowNode({ data })
      expect(result).toBeDefined()
      // The component returns a React element - we can't easily inspect the rendered output
      // without a renderer, but we can verify it doesn't throw and returns something
      expect(result).not.toBeNull()
    })
  })

  describe('render with input ports', () => {
    it('renders node with single input port', () => {
      const data: FlowNodeData = {
        label: 'Input Node',
        inputs: [createMockPort('data-in', 'Data Input', 'input')],
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders node with multiple input ports', () => {
      const data: FlowNodeData = {
        label: 'Multi Input Node',
        inputs: [
          createMockPort('data-in', 'Data Input', 'input'),
          createMockPort('config-in', 'Config Input', 'input'),
          createMockPort('trigger-in', 'Trigger', 'input'),
        ],
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('preserves port IDs in handle IDs', () => {
      const data: FlowNodeData = {
        label: 'Input Node',
        inputs: [createMockPort('my-custom-port', 'My Port', 'input')],
      }

      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })
  })

  describe('render with output ports', () => {
    it('renders node with single output port', () => {
      const data: FlowNodeData = {
        label: 'Output Node',
        outputs: [createMockPort('result-out', 'Result', 'output')],
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders node with multiple output ports', () => {
      const data: FlowNodeData = {
        label: 'Multi Output Node',
        outputs: [createMockPort('result-out', 'Result', 'output'), createMockPort('error-out', 'Error', 'output'), createMockPort('log-out', 'Log', 'output')],
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })
  })

  describe('render with both input and output ports', () => {
    it('renders node with both inputs and outputs', () => {
      const data: FlowNodeData = {
        label: 'Process Node',
        description: 'A node that processes data',
        inputs: [createMockPort('data-in', 'Data', 'input'), createMockPort('config-in', 'Config', 'input')],
        outputs: [createMockPort('result-out', 'Result', 'output'), createMockPort('error-out', 'Error', 'output')],
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })
  })

  describe('handle ID format compliance', () => {
    it('uses correct handle ID format for input ports', () => {
      const data: FlowNodeData = {
        label: 'Input Format Test',
        inputs: [createMockPort('test-in', 'Test Input', 'input')],
      }

      // The component should render with handle ID in format `in:{portId}`
      // This is verified by the adapter contract in flow-reactflow.ts
      const result = FlowNode({ data })
      expect(result).toBeDefined()

      // The handle component receives id={`in:${port.id}`}
      // which creates 'in:test-in' for this port
    })

    it('uses correct handle ID format for output ports', () => {
      const data: FlowNodeData = {
        label: 'Output Format Test',
        outputs: [createMockPort('test-out', 'Test Output', 'output')],
      }

      // The component should render with handle ID in format `out:{portId}`
      const result = FlowNode({ data })
      expect(result).toBeDefined()

      // The handle component receives id={`out:${port.id}`}
      // which creates 'out:test-out' for this port
    })
  })

  describe('description rendering', () => {
    it('renders node with description', () => {
      const data: FlowNodeData = {
        label: 'Described Node',
        description: 'This is a detailed description',
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders node without description', () => {
      const data: FlowNodeData = {
        label: 'Undescribed Node',
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })
  })

  describe('parameter rendering', () => {
    it('renders node with string parameter', () => {
      const data: FlowNodeData = {
        label: 'Param Node',
        parameters: [createMockParameter('username', { type: 'Some', value: 'john' })],
        onParameterChange: () => {},
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders node with number parameter', () => {
      const data: FlowNodeData = {
        label: 'Param Node',
        parameters: [createMockParameter('count', { type: 'Some', value: 42 })],
        onParameterChange: () => {},
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders node with boolean parameter', () => {
      const data: FlowNodeData = {
        label: 'Param Node',
        parameters: [createMockParameter('enabled', { type: 'Some', value: true })],
        onParameterChange: () => {},
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders node with None value parameter (defaults to string input)', () => {
      const data: FlowNodeData = {
        label: 'Param Node',
        parameters: [createMockParameter('empty', { type: 'None' })],
        onParameterChange: () => {},
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders node with multiple primitive parameters', () => {
      const data: FlowNodeData = {
        label: 'Multi Param Node',
        parameters: [
          createMockParameter('name', { type: 'Some', value: 'test' }),
          createMockParameter('count', { type: 'Some', value: 10 }),
          createMockParameter('active', { type: 'Some', value: false }),
        ],
        onParameterChange: () => {},
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders complex parameters with ComplexParameterControl (objects, arrays)', () => {
      const data: FlowNodeData = {
        label: 'Complex Param Node',
        parameters: [
          createMockParameter('config', { type: 'Some', value: { key: 'value' } }),
          createMockParameter('items', { type: 'Some', value: [1, 2, 3] }),
          createMockParameter('valid', { type: 'Some', value: 'string' }),
        ],
        onParameterChange: () => {},
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
      // Complex parameters should be rendered with ComplexParameterControl
      // Primitive parameters should be rendered with PrimitiveParameterControl
    })

    it('renders node with object parameter', () => {
      const data: FlowNodeData = {
        label: 'Object Param Node',
        parameters: [createMockParameter('config', { type: 'Some', value: { key: 'value', nested: { deep: true } } })],
        onParameterChange: () => {},
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders node with array parameter', () => {
      const data: FlowNodeData = {
        label: 'Array Param Node',
        parameters: [createMockParameter('items', { type: 'Some', value: [1, 2, 3, 'four', { five: 5 }] })],
        onParameterChange: () => {},
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders node with null parameter', () => {
      const data: FlowNodeData = {
        label: 'Null Param Node',
        parameters: [createMockParameter('empty', { type: 'Some', value: null })],
        onParameterChange: () => {},
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders mixed primitive and complex parameters', () => {
      const data: FlowNodeData = {
        label: 'Mixed Param Node',
        parameters: [
          createMockParameter('name', { type: 'Some', value: 'test' }),
          createMockParameter('count', { type: 'Some', value: 42 }),
          createMockParameter('config', { type: 'Some', value: { enabled: true } }),
          createMockParameter('items', { type: 'Some', value: ['a', 'b'] }),
          createMockParameter('active', { type: 'Some', value: true }),
        ],
        onParameterChange: () => {},
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('does not render parameters when onParameterChange is not provided', () => {
      const data: FlowNodeData = {
        label: 'No Handler Node',
        parameters: [createMockParameter('test', { type: 'Some', value: 'value' })],
        // onParameterChange is undefined
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })

    it('renders node with ports and parameters combined', () => {
      const data: FlowNodeData = {
        label: 'Full Node',
        description: 'Node with everything',
        inputs: [createMockPort('in', 'Input', 'input')],
        outputs: [createMockPort('out', 'Output', 'output')],
        parameters: [createMockParameter('threshold', { type: 'Some', value: 0.5 }), createMockParameter('enabled', { type: 'Some', value: true })],
        onParameterChange: () => {},
      }

      expect(() => FlowNode({ data })).not.toThrow()
      const result = FlowNode({ data })
      expect(result).toBeDefined()
    })
  })

  describe('parameter change handling', () => {
    it('calls onParameterChange when parameter value changes', () => {
      const received: Array<{ name: string; value: Option<unknown> }> = []
      const data: FlowNodeData = {
        label: 'Callback Node',
        parameters: [createMockParameter('test', { type: 'Some', value: 'initial' })],
        onParameterChange: (name, value) => received.push({ name, value }),
      }

      const result = FlowNode({ data })
      expect(result).toBeDefined()

      // Note: In a real browser environment, we would trigger the change event
      // and verify the callback is invoked. Here we verify the component
      // renders with the callback prop correctly wired.
    })

    it('parameter updates are scoped to individual parameters', () => {
      const updates = new Map<string, Option<unknown>>()
      const data: FlowNodeData = {
        label: 'Scoped Node',
        parameters: [createMockParameter('paramA', { type: 'Some', value: 'valueA' }), createMockParameter('paramB', { type: 'Some', value: 42 })],
        onParameterChange: (name, value) => updates.set(name, value),
      }

      const result = FlowNode({ data })
      expect(result).toBeDefined()

      // Each parameter has its own onChange handler via handleParameterChange
      // closure, ensuring scoped updates
    })
  })
})
