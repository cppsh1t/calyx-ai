import { scriptTsNode } from '@/built-in/scriptTsNode.ts'
import { describe, expect, test } from 'bun:test'
import type { FlowConfig, NodeData, NodeDefinition, NodeExecuteContext, NodeExecuteResult, NodeInstance } from 'calyx-flow'
import { Some, unwrap } from 'calyx-flow'
import { buildFlow, NodeRegistry } from 'calyx-flow/core'
import { z } from 'zod'

const scriptOutputDefinition = unwrap(scriptTsNode.outputs)[0]!

function createCurrentNodeInstance(script: string, inputData: unknown): NodeInstance {
  const inputDefinition = unwrap(scriptTsNode.inputs)[0]!
  const parameterDefinition = unwrap(scriptTsNode.parameters)[0]!

  return {
    id: 'script-ts-node-1',
    name: scriptTsNode.name,
    position: { x: 100, y: 0 },
    description: scriptTsNode.description,
    type: scriptTsNode.type,
    docs: scriptTsNode.docs,
    group: scriptTsNode.group,
    parameters: Some([
      {
        name: parameterDefinition.name,
        description: parameterDefinition.description,
        schema: parameterDefinition.schema,
        value: Some(script),
      },
    ]),
    inputs: Some([
      {
        id: 'script-ts-input-1',
        name: inputDefinition.name,
        description: inputDefinition.description,
        schema: inputDefinition.schema,
        value: Some(inputData),
        used: false,
      },
    ]),
    outputs: Some([
      {
        id: 'script-ts-output-1',
        name: scriptOutputDefinition.name,
        description: scriptOutputDefinition.description,
        schema: scriptOutputDefinition.schema,
        value: Some(undefined),
        used: false,
        requiredInputs: scriptOutputDefinition.requiredInputs,
        executor: scriptOutputDefinition.executor,
      },
    ]),
    runningTimes: 0,
  }
}

async function executeScript(script: string, inputData: unknown, signal: AbortSignal = new AbortController().signal): Promise<NodeExecuteResult> {
  const context: NodeExecuteContext = {
    currentNode: createCurrentNodeInstance(script, inputData),
    parameters: Some([{ name: 'script', value: Some(script), description: 'The TypeScript code to transpile and execute', schema: z.string() }]),
    inputs: Some([
      { id: 'script-ts-input-1', name: 'input', description: 'The input data for the script', schema: z.unknown(), value: Some(inputData), used: false },
    ]),
    signal,
  }

  return scriptOutputDefinition.executor(context)
}

function createStartNodeDefinition(inputData: unknown): NodeDefinition {
  return {
    name: 'Script TypeScript Input Start',
    description: 'Provides input data for TypeScript script node integration tests.',
    type: ['start-node'],
    docs: '',
    group: 'test',
    parameters: Some([]),
    inputs: Some([]),
    outputs: Some([
      {
        name: 'inputOut',
        description: 'The input data for the TypeScript script node.',
        schema: z.unknown(),
        requiredInputs: Some([]),
        executor: async () => ({ continue: true, data: inputData }),
      },
    ]),
  }
}

function createResultReceiverDefinition(): NodeDefinition {
  return {
    name: 'TypeScript Script Result Receiver',
    description: 'Receives TypeScript script node output for assertions.',
    type: [],
    docs: '',
    group: 'test',
    parameters: Some([]),
    inputs: Some([
      {
        name: 'resultIn',
        description: 'Receives TypeScript script execution result.',
        schema: z.any(),
      },
    ]),
    outputs: Some([]),
  }
}

function createStartNodeData(): NodeData {
  return {
    id: 'start-1',
    key: 'test/script-ts-start',
    name: 'Script TypeScript Input Start',
    position: { x: 0, y: 0 },
    parameters: Some([]),
    inputs: Some([]),
    outputs: Some([{ id: 'start-input-out', name: 'inputOut' }]),
  }
}

function createScriptNodeData(script: string): NodeData {
  return {
    id: 'script-ts-1',
    key: 'built-in/script-ts',
    name: 'Script TypeScript Node',
    position: { x: 200, y: 0 },
    parameters: Some([{ name: 'script', value: Some(script) }]),
    inputs: Some([{ id: 'script-ts-input-in', name: 'input' }]),
    outputs: Some([{ id: 'script-ts-output-out', name: 'output' }]),
  }
}

function createReceiverNodeData(): NodeData {
  return {
    id: 'receiver-1',
    key: 'test/script-ts-result-receiver',
    name: 'TypeScript Script Result Receiver',
    position: { x: 400, y: 0 },
    parameters: Some([]),
    inputs: Some([{ id: 'receiver-result-in', name: 'resultIn' }]),
    outputs: Some([]),
  }
}

async function runScriptFlow(script: string, inputData: unknown, abort?: AbortController) {
  const registry = new NodeRegistry()
  registry.register('built-in/script-ts', scriptTsNode)
  registry.register('test/script-ts-start', createStartNodeDefinition(inputData))
  registry.register('test/script-ts-result-receiver', createResultReceiverDefinition())

  const config: FlowConfig = {
    name: 'script-ts-node-integration',
    nodes: [createStartNodeData(), createScriptNodeData(script), createReceiverNodeData()],
    edges: [
      { sourceNodeId: 'start-1', sourcePortId: 'start-input-out', targetNodeId: 'script-ts-1', targetPortId: 'script-ts-input-in' },
      { sourceNodeId: 'script-ts-1', sourcePortId: 'script-ts-output-out', targetNodeId: 'receiver-1', targetPortId: 'receiver-result-in' },
    ],
  }

  const flow = buildFlow(config, registry, undefined)
  const instance = await flow.run(abort)

  const scriptNodeInstance = instance.nodes.find((node) => node.id === 'script-ts-1')
  const receiverNodeInstance = instance.nodes.find((node) => node.id === 'receiver-1')

  return { instance, scriptNodeInstance, receiverNodeInstance }
}

describe('scriptTsNode definition', () => {
  test('has the expected metadata and ports', () => {
    expect(scriptTsNode.name).toBe('Script TypeScript Node')
    expect(scriptTsNode.group).toBe('utility')
    expect(scriptTsNode.type).toEqual([])
    expect(scriptTsNode.description).toBe('A node that transpiles and executes a TypeScript code snippet')

    const parameters = unwrap(scriptTsNode.parameters)
    const inputs = unwrap(scriptTsNode.inputs)
    const outputs = unwrap(scriptTsNode.outputs)

    expect(parameters).toHaveLength(1)
    expect(parameters[0]?.name).toBe('script')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]?.name).toBe('input')
    expect(outputs).toHaveLength(1)
    expect(outputs[0]?.name).toBe('output')
    expect(unwrap(outputs[0]!.requiredInputs)).toEqual(['input'])
    expect(typeof outputs[0]?.executor).toBe('function')
  })
})

describe('scriptTsNode executor', () => {
  test('transpiles TypeScript syntax and executes with inputData', async () => {
    const result = await executeScript('const message: string = inputData.message.toUpperCase(); return message', { message: 'hello typescript' })

    expect(result).toEqual({ continue: true, data: 'HELLO TYPESCRIPT' })
  })

  test('supports TypeScript interfaces and typed object shaping', async () => {
    const result = await executeScript(
      'interface Payload { count: number; label: string } const payload: Payload = inputData; return { doubled: payload.count * 2, label: payload.label.toUpperCase() }',
      { count: 5, label: 'typed' }
    )

    expect(result).toEqual({ continue: true, data: { doubled: 10, label: 'TYPED' } })
  })

  test('wraps TypeScript syntax errors with a clearer message', async () => {
    await expect(executeScript('const broken: string = ; return broken', { value: 1 })).rejects.toThrow(/Error in TypeScript syntax:/)
  })

  test('rethrows runtime errors from the transpiled script body', async () => {
    await expect(executeScript('throw new Error("boom from runtime")', { value: 1 })).rejects.toThrow('boom from runtime')
  })

  test('returns continue=false immediately when the signal is already aborted', async () => {
    const abort = new AbortController()
    abort.abort()

    const result = await executeScript('return inputData', 'ignored', abort.signal)

    expect(result).toEqual({ continue: false, data: undefined })
  })

  test('returns continue=false when execution is aborted while waiting', async () => {
    const abort = new AbortController()
    const execution = executeScript('return new Promise(() => {})', 'ignored', abort.signal)

    queueMicrotask(() => abort.abort())

    await expect(execution).resolves.toEqual({ continue: false, data: undefined })
  })
})

describe('scriptTsNode flow integration', () => {
  test('transpiles TypeScript, transforms input data, and propagates the result downstream', async () => {
    const { scriptNodeInstance, receiverNodeInstance } = await runScriptFlow(
      'type Input = { count: number; label: string }; const value: Input = inputData; return { doubled: value.count * 2, label: `${value.label}-typed` }',
      { count: 21, label: 'work' }
    )

    expect(scriptNodeInstance).toBeDefined()
    expect(receiverNodeInstance).toBeDefined()

    const scriptOutputs = unwrap(scriptNodeInstance!.outputs)
    const receiverInputs = unwrap(receiverNodeInstance!.inputs)
    const outputValue = unwrap(scriptOutputs[0]!.value)
    const propagatedValue = unwrap(receiverInputs[0]!.value)

    expect(outputValue).toEqual({ doubled: 42, label: 'work-typed' })
    expect(scriptOutputs[0]!.used).toBe(true)
    expect(receiverInputs[0]!.used).toBe(true)
    expect(propagatedValue).toEqual(outputValue)
  })

  test('rejects the flow when the provided TypeScript has invalid syntax', async () => {
    await expect(runScriptFlow('type Broken = { count: number; return inputData', { count: 1 })).rejects.toThrow(/Error in TypeScript syntax:/)
  })
})
