import { scriptJsNode } from '@/built-in/scriptJsNode.ts'
import { describe, expect, test } from 'bun:test'
import type { FlowConfig, NodeData, NodeDefinition, NodeExecuteContext, NodeExecuteResult, NodeInstance } from 'calyx-flow'
import { Some, unwrap } from 'calyx-flow'
import { buildFlow, NodeRegistry } from 'calyx-flow/core'
import { z } from 'zod'

const scriptOutputDefinition = unwrap(scriptJsNode.outputs)[0]!

function createCurrentNodeInstance(script: string, inputData: unknown): NodeInstance {
  const inputDefinition = unwrap(scriptJsNode.inputs)[0]!
  const parameterDefinition = unwrap(scriptJsNode.parameters)[0]!

  return {
    id: 'script-node-1',
    name: scriptJsNode.name,
    position: { x: 100, y: 0 },
    description: scriptJsNode.description,
    type: scriptJsNode.type,
    docs: scriptJsNode.docs,
    group: scriptJsNode.group,
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
        id: 'script-input-1',
        name: inputDefinition.name,
        description: inputDefinition.description,
        schema: inputDefinition.schema,
        value: Some(inputData),
        used: false,
      },
    ]),
    outputs: Some([
      {
        id: 'script-output-1',
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
    parameters: Some([{ name: 'script', value: Some(script), description: 'The JavaScript code to execute', schema: z.string() }]),
    inputs: Some([
      { id: 'script-input-1', name: 'input', description: 'The input data for the script', schema: z.unknown(), value: Some(inputData), used: false },
    ]),
    signal,
  }

  return scriptOutputDefinition.executor(context)
}

function createStartNodeDefinition(inputData: unknown): NodeDefinition {
  return {
    name: 'Script Input Start',
    description: 'Provides input data for script node integration tests.',
    type: ['start-node'],
    docs: '',
    group: 'test',
    parameters: Some([]),
    inputs: Some([]),
    outputs: Some([
      {
        name: 'inputOut',
        description: 'The input data for the script node.',
        schema: z.unknown(),
        requiredInputs: Some([]),
        executor: async () => ({ continue: true, data: inputData }),
      },
    ]),
  }
}

function createResultReceiverDefinition(): NodeDefinition {
  return {
    name: 'Script Result Receiver',
    description: 'Receives script node output for assertions.',
    type: [],
    docs: '',
    group: 'test',
    parameters: Some([]),
    inputs: Some([
      {
        name: 'resultIn',
        description: 'Receives script execution result.',
        schema: z.any(),
      },
    ]),
    outputs: Some([]),
  }
}

function createStartNodeData(): NodeData {
  return {
    id: 'start-1',
    key: 'test/script-start',
    name: 'Script Input Start',
    position: { x: 0, y: 0 },
    parameters: Some([]),
    inputs: Some([]),
    outputs: Some([{ id: 'start-input-out', name: 'inputOut' }]),
  }
}

function createScriptNodeData(script: string): NodeData {
  return {
    id: 'script-1',
    key: 'built-in/script-js',
    name: 'Script JavaScript Node',
    position: { x: 200, y: 0 },
    parameters: Some([{ name: 'script', value: Some(script) }]),
    inputs: Some([{ id: 'script-input-in', name: 'input' }]),
    outputs: Some([{ id: 'script-output-out', name: 'output' }]),
  }
}

function createReceiverNodeData(): NodeData {
  return {
    id: 'receiver-1',
    key: 'test/script-result-receiver',
    name: 'Script Result Receiver',
    position: { x: 400, y: 0 },
    parameters: Some([]),
    inputs: Some([{ id: 'receiver-result-in', name: 'resultIn' }]),
    outputs: Some([]),
  }
}

async function runScriptFlow(script: string, inputData: unknown, abort?: AbortController) {
  const registry = new NodeRegistry()
  registry.register('built-in/script-js', scriptJsNode)
  registry.register('test/script-start', createStartNodeDefinition(inputData))
  registry.register('test/script-result-receiver', createResultReceiverDefinition())

  const config: FlowConfig = {
    name: 'script-js-node-integration',
    nodes: [createStartNodeData(), createScriptNodeData(script), createReceiverNodeData()],
    edges: [
      { sourceNodeId: 'start-1', sourcePortId: 'start-input-out', targetNodeId: 'script-1', targetPortId: 'script-input-in' },
      { sourceNodeId: 'script-1', sourcePortId: 'script-output-out', targetNodeId: 'receiver-1', targetPortId: 'receiver-result-in' },
    ],
  }

  const flow = buildFlow(config, registry, undefined)
  const instance = await flow.run(abort)

  const scriptNodeInstance = instance.nodes.find((node) => node.id === 'script-1')
  const receiverNodeInstance = instance.nodes.find((node) => node.id === 'receiver-1')

  return { instance, scriptNodeInstance, receiverNodeInstance }
}

describe('scriptJsNode definition', () => {
  test('has the expected metadata and ports', () => {
    expect(scriptJsNode.name).toBe('Script JavaScript Node')
    expect(scriptJsNode.group).toBe('utility')
    expect(scriptJsNode.type).toEqual([])
    expect(scriptJsNode.description).toBe('A node that executes a JavaScript code snippet')

    const parameters = unwrap(scriptJsNode.parameters)
    const inputs = unwrap(scriptJsNode.inputs)
    const outputs = unwrap(scriptJsNode.outputs)

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

describe('scriptJsNode executor', () => {
  test('executes the script with inputData and returns its result', async () => {
    const result = await executeScript('return inputData.message.toUpperCase()', { message: 'hello script' })

    expect(result).toEqual({ continue: true, data: 'HELLO SCRIPT' })
  })

  test('wraps JavaScript syntax errors with a clearer message', async () => {
    await expect(executeScript('return {', { value: 1 })).rejects.toThrow(/Error in script syntax:/)
  })

  test('rethrows runtime errors from the script body', async () => {
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

describe('scriptJsNode flow integration', () => {
  test('transforms input data and propagates the result downstream', async () => {
    const { scriptNodeInstance, receiverNodeInstance } = await runScriptFlow('return { doubled: inputData.count * 2, label: `${inputData.label}-done` }', {
      count: 21,
      label: 'work',
    })

    expect(scriptNodeInstance).toBeDefined()
    expect(receiverNodeInstance).toBeDefined()

    const scriptOutputs = unwrap(scriptNodeInstance!.outputs)
    const receiverInputs = unwrap(receiverNodeInstance!.inputs)
    const outputValue = unwrap(scriptOutputs[0]!.value)
    const propagatedValue = unwrap(receiverInputs[0]!.value)

    expect(outputValue).toEqual({ doubled: 42, label: 'work-done' })
    expect(scriptOutputs[0]!.used).toBe(true)
    expect(receiverInputs[0]!.used).toBe(true)
    expect(propagatedValue).toEqual(outputValue)
  })

  test('rejects the flow when the provided script has invalid syntax', async () => {
    await expect(runScriptFlow('return (() => {', { count: 1 })).rejects.toThrow(/Error in script syntax:/)
  })
})
