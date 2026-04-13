import { systemContextNode } from '@/core/built-in.ts'
import { buildFlow } from '@/core/flow.ts'
import { NodeRegistry } from '@/core/registry.ts'
import type { FlowConfig, NodeData, NodeDefinition } from '@/types'
import { None, Some, unwrap, unwrapOr } from '@/utils/structure.ts'
import { describe, expect, test } from 'bun:test'
import z from 'zod'

// --- Helpers ---

const BUILTIN_KEY = 'built-in/SystemContext'

/** Upstream start node that emits a context object */
function createContextStartDef(contextData: Record<string, unknown>): NodeDefinition {
  return {
    name: 'ContextProvider',
    description: 'Provides context data for testing.',
    type: ['start-node'],
    docs: '',
    group: 'test',
    parameters: None,
    inputs: None,
    outputs: Some([
      {
        name: 'contextOut',
        description: 'Emits the context record.',
        schema: z.record(z.string(), z.unknown()),
        requiredInputs: None,
        executor: async () => ({ continue: true, data: contextData }),
      },
    ]),
  }
}

/** Downstream end node that receives the rendered systemPrompt */
function createEndNodeDef(): NodeDefinition {
  return {
    name: 'PromptReceiver',
    description: 'Receives the rendered prompt.',
    type: [],
    docs: '',
    group: 'test',
    parameters: None,
    inputs: Some([
      {
        name: 'promptIn',
        description: 'The rendered system prompt.',
        schema: z.string(),
      },
    ]),
    outputs: None,
  }
}

/** Create a NodeData for the SystemContext node with a given template parameter */
function createSystemContextData(template: string): NodeData {
  return {
    id: 'system-context-1',
    key: BUILTIN_KEY,
    name: 'SystemContext',
    position: { x: 100, y: 0 },
    parameters: Some([{ name: 'template', value: Some(template) }]),
    inputs: Some([{ id: 'sc-context-in', name: 'context' }]),
    outputs: Some([{ id: 'sc-prompt-out', name: 'systemPrompt' }]),
  }
}

/** Create a NodeData for the start node that emits context data */
function createContextStartData(contextData: Record<string, unknown>): NodeData {
  return {
    id: 'start-1',
    key: 'test/context-provider',
    name: 'ContextProvider',
    position: { x: 0, y: 0 },
    parameters: None,
    inputs: None,
    outputs: Some([{ id: 'start-context-out', name: 'contextOut' }]),
  }
}

/** Create a NodeData for the end node that receives the prompt */
function createEndNodeData(): NodeData {
  return {
    id: 'end-1',
    key: 'test/prompt-receiver',
    name: 'PromptReceiver',
    position: { x: 200, y: 0 },
    parameters: None,
    inputs: Some([{ id: 'end-prompt-in', name: 'promptIn' }]),
    outputs: None,
  }
}

/**
 * Build and run a minimal flow:
 *   ContextProvider --contextOut--> SystemContext.context --systemPrompt--> PromptReceiver.promptIn
 */
async function runSystemContextFlow(contextData: Record<string, unknown>, template: string, abort?: AbortController) {
  const registry = new NodeRegistry()
  registry.register(BUILTIN_KEY, systemContextNode)
  registry.register('test/context-provider', createContextStartDef(contextData))
  registry.register('test/prompt-receiver', createEndNodeDef())

  const config: FlowConfig = {
    name: 'test-system-context',
    nodes: [createContextStartData(contextData), createSystemContextData(template), createEndNodeData()],
    edges: [
      { sourceNodeId: 'start-1', sourcePortId: 'start-context-out', targetNodeId: 'system-context-1', targetPortId: 'sc-context-in' },
      { sourceNodeId: 'system-context-1', sourcePortId: 'sc-prompt-out', targetNodeId: 'end-1', targetPortId: 'end-prompt-in' },
    ],
  }

  const flow = buildFlow(config, registry, undefined)
  const instance = await flow.run(abort)

  const systemContextNodeInst = instance.nodes.find((n) => n.id === 'system-context-1')
  const endNodeInst = instance.nodes.find((n) => n.id === 'end-1')

  return { instance, systemContextNodeInst, endNodeInst }
}

// --- Node Definition Structure Tests ---

describe('systemContextNode definition', () => {
  test('has correct name, group, and type', () => {
    expect(systemContextNode.name).toBe('SystemContext')
    expect(systemContextNode.group).toBe('agent')
    expect(systemContextNode.type).toEqual([])
  })

  test('has non-empty description and docs', () => {
    expect(systemContextNode.description.length).toBeGreaterThan(0)
    expect(systemContextNode.docs.length).toBeGreaterThan(0)
  })

  test('defines a template parameter', () => {
    const params = unwrap(systemContextNode.parameters)
    expect(params).toHaveLength(1)
    expect(params[0]?.name).toBe('template')
  })

  test('defines a context input', () => {
    const inputs = unwrap(systemContextNode.inputs)
    expect(inputs).toHaveLength(1)
    expect(inputs[0]?.name).toBe('context')
  })

  test('defines a systemPrompt output with executor', () => {
    const outputs = unwrap(systemContextNode.outputs)
    expect(outputs).toHaveLength(1)
    expect(outputs[0]?.name).toBe('systemPrompt')
    expect(typeof outputs[0]?.executor).toBe('function')
  })

  test('systemPrompt output declares context as required input', () => {
    const outputs = unwrap(systemContextNode.outputs)
    const requiredInputs = unwrapOr<string[]>(outputs[0]?.requiredInputs ?? None, [])
    expect(requiredInputs).toContain('context')
  })
})

// --- Flow Execution Tests ---

describe('systemContextNode flow execution', () => {
  test('renders a simple template with context variables', async () => {
    const { systemContextNodeInst, endNodeInst } = await runSystemContextFlow(
      { role: 'translator', task: 'translate English to Chinese' },
      'You are a {{role}}. Your task is to {{task}}.'
    )

    const outputs = unwrap(systemContextNodeInst!.outputs)
    const output = unwrap(outputs[0]!.value)
    expect(output).toBe('You are a translator. Your task is to translate English to Chinese.')

    const endInputs = unwrap(endNodeInst!.inputs)
    const endInput = unwrap(endInputs[0]!.value)
    expect(endInput).toBe('You are a translator. Your task is to translate English to Chinese.')
  })

  test('leaves undefined variables as-is', async () => {
    const { systemContextNodeInst } = await runSystemContextFlow({ name: 'Alice' }, 'Hello {{name}}, today is {{day}}.')

    const outputs = unwrap(systemContextNodeInst!.outputs)
    const output = unwrap(outputs[0]!.value)
    expect(output).toBe('Hello Alice, today is {{day}}.')
  })

  test('stringifies non-string context values', async () => {
    const { systemContextNodeInst } = await runSystemContextFlow({ count: 42, items: [1, 2, 3] }, 'Count: {{count}}, items: {{items}}.')

    const outputs = unwrap(systemContextNodeInst!.outputs)
    const output = unwrap(outputs[0]!.value)
    expect(output).toBe('Count: 42, items: [1,2,3].')
  })

  test('trims whitespace in variable names', async () => {
    const { systemContextNodeInst } = await runSystemContextFlow({ role: 'assistant' }, 'Hello {{  role  }}!')

    const outputs = unwrap(systemContextNodeInst!.outputs)
    const output = unwrap(outputs[0]!.value)
    expect(output).toBe('Hello assistant!')
  })

  test('works with empty context object (all variables unresolved)', async () => {
    const { systemContextNodeInst } = await runSystemContextFlow({}, 'Hello {{name}}!')

    const outputs = unwrap(systemContextNodeInst!.outputs)
    const output = unwrap(outputs[0]!.value)
    expect(output).toBe('Hello {{name}}!')
  })

  test('handles multiple template variables', async () => {
    const { systemContextNodeInst } = await runSystemContextFlow(
      { role: 'coder', expertise: 'TypeScript', time: '2024-01-01' },
      'Role: {{role}}. Expertise: {{expertise}}. Time: {{time}}.'
    )

    const outputs = unwrap(systemContextNodeInst!.outputs)
    const output = unwrap(outputs[0]!.value)
    expect(output).toBe('Role: coder. Expertise: TypeScript. Time: 2024-01-01.')
  })

  test('renders template with no variables as-is', async () => {
    const { systemContextNodeInst } = await runSystemContextFlow({}, 'Just a plain string.')

    const outputs = unwrap(systemContextNodeInst!.outputs)
    const output = unwrap(outputs[0]!.value)
    expect(output).toBe('Just a plain string.')
  })

  test('propagates rendered prompt to downstream node via edge', async () => {
    const { endNodeInst } = await runSystemContextFlow({ role: 'summarizer' }, 'You are a {{role}}.')

    const endInputs = unwrap(endNodeInst!.inputs)
    expect(endInputs[0]?.used).toBe(true)
    const endInput = unwrap(endInputs[0]!.value)
    expect(endInput).toBe('You are a summarizer.')
  })

  test('produces fresh runtime state for each run', async () => {
    const registry = new NodeRegistry()
    registry.register(BUILTIN_KEY, systemContextNode)
    registry.register('test/context-provider', createContextStartDef({ role: 'test' }))
    registry.register('test/prompt-receiver', createEndNodeDef())

    const config: FlowConfig = {
      name: 'test-fresh-state',
      nodes: [createContextStartData({ role: 'test' }), createSystemContextData('You are a {{role}}.'), createEndNodeData()],
      edges: [
        { sourceNodeId: 'start-1', sourcePortId: 'start-context-out', targetNodeId: 'system-context-1', targetPortId: 'sc-context-in' },
        { sourceNodeId: 'system-context-1', sourcePortId: 'sc-prompt-out', targetNodeId: 'end-1', targetPortId: 'end-prompt-in' },
      ],
    }

    const flow = buildFlow(config, registry, undefined)
    const run1 = await flow.run()
    const run2 = await flow.run()

    expect(run1.id).not.toBe(run2.id)

    const node1 = run1.nodes.find((n) => n.id === 'system-context-1')
    const node2 = run2.nodes.find((n) => n.id === 'system-context-1')

    const outputs1 = unwrap(node1!.outputs)
    const outputs2 = unwrap(node2!.outputs)
    const output1 = unwrap(outputs1[0]!.value)
    const output2 = unwrap(outputs2[0]!.value)
    expect(output1).toBe('You are a test.')
    expect(output2).toBe('You are a test.')
  })

  test('does not execute when aborted before run starts', async () => {
    const registry = new NodeRegistry()
    registry.register(BUILTIN_KEY, systemContextNode)
    registry.register('test/context-provider', createContextStartDef({ role: 'should-not-run' }))
    registry.register('test/prompt-receiver', createEndNodeDef())

    const config: FlowConfig = {
      name: 'test-abort-before',
      nodes: [createContextStartData({ role: 'should-not-run' }), createSystemContextData('You are a {{role}}.'), createEndNodeData()],
      edges: [
        { sourceNodeId: 'start-1', sourcePortId: 'start-context-out', targetNodeId: 'system-context-1', targetPortId: 'sc-context-in' },
        { sourceNodeId: 'system-context-1', sourcePortId: 'sc-prompt-out', targetNodeId: 'end-1', targetPortId: 'end-prompt-in' },
      ],
    }

    const flow = buildFlow(config, registry, undefined)
    const abort = new AbortController()
    abort.abort()

    const instance = await flow.run(abort)

    const systemContext = instance.nodes.find((n) => n.id === 'system-context-1')
    expect(systemContext?.outputs?.type).toBe('Some')
    const outputs = unwrap(systemContext!.outputs)
    expect(outputs[0]?.used).toBe(false)
    expect(outputs[0]?.value.type).toBe('None')
  })
})
