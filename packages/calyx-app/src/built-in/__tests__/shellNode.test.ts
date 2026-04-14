import { shellNode } from '@/built-in/shellNode.ts'
import { describe, expect, test } from 'bun:test'
import type { FlowConfig, NodeData, NodeDefinition } from 'calyx-flow'
import { Some, unwrap } from 'calyx-flow'
import { buildFlow, NodeRegistry } from 'calyx-flow/core'
import { z } from 'zod'

const shellOutputSchema = unwrap(shellNode.outputs)[0]!.schema

function createStartNodeDefinition(command: string, timeout: number): NodeDefinition {
  return {
    name: 'Shell Start',
    description: 'Provides command inputs for shell node integration tests.',
    type: ['start-node'],
    docs: '',
    group: 'test',
    parameters: Some([]),
    inputs: Some([]),
    outputs: Some([
      {
        name: 'commandOut',
        description: 'The shell command to execute.',
        schema: z.string(),
        requiredInputs: Some([]),
        executor: async () => ({ continue: true, data: command }),
      },
      {
        name: 'timeoutOut',
        description: 'The timeout for the shell command.',
        schema: z.number().int().positive(),
        requiredInputs: Some([]),
        executor: async () => ({ continue: true, data: timeout }),
      },
    ]),
  }
}

function createResultReceiverDefinition(): NodeDefinition {
  return {
    name: 'Shell Result Receiver',
    description: 'Receives shell node output for assertions.',
    type: [],
    docs: '',
    group: 'test',
    parameters: Some([]),
    inputs: Some([
      {
        name: 'resultIn',
        description: 'Receives shell execution result.',
        schema: shellOutputSchema,
      },
    ]),
    outputs: Some([]),
  }
}

function createStartNodeData(): NodeData {
  return {
    id: 'start-1',
    key: 'test/shell-start',
    name: 'Shell Start',
    position: { x: 0, y: 0 },
    parameters: Some([]),
    inputs: Some([]),
    outputs: Some([
      { id: 'start-command-out', name: 'commandOut' },
      { id: 'start-timeout-out', name: 'timeoutOut' },
    ]),
  }
}

function createShellNodeData(shellEnvironment: string): NodeData {
  return {
    id: 'shell-1',
    key: 'built-in/shell',
    name: 'Shell Node',
    position: { x: 200, y: 0 },
    parameters: Some([{ name: 'shell environment', value: Some(shellEnvironment) }]),
    inputs: Some([
      { id: 'shell-command-in', name: 'command' },
      { id: 'shell-timeout-in', name: 'timeout' },
    ]),
    outputs: Some([{ id: 'shell-output-out', name: 'output' }]),
  }
}

function createReceiverNodeData(): NodeData {
  return {
    id: 'receiver-1',
    key: 'test/shell-result-receiver',
    name: 'Shell Result Receiver',
    position: { x: 400, y: 0 },
    parameters: Some([]),
    inputs: Some([{ id: 'receiver-result-in', name: 'resultIn' }]),
    outputs: Some([]),
  }
}

describe('shellNode flow integration', () => {
  test('executes a shell command and propagates the structured result through the flow', async () => {
    const registry = new NodeRegistry()
    registry.register('built-in/shell', shellNode)
    registry.register('test/shell-start', createStartNodeDefinition('Write-Output "hello-shell-node"', 2_000))
    registry.register('test/shell-result-receiver', createResultReceiverDefinition())

    const config: FlowConfig<undefined> = {
      name: 'shell-node-integration',
      nodes: [createStartNodeData(), createShellNodeData('powershell'), createReceiverNodeData()],
      edges: [
        { sourceNodeId: 'start-1', sourcePortId: 'start-command-out', targetNodeId: 'shell-1', targetPortId: 'shell-command-in' },
        { sourceNodeId: 'start-1', sourcePortId: 'start-timeout-out', targetNodeId: 'shell-1', targetPortId: 'shell-timeout-in' },
        { sourceNodeId: 'shell-1', sourcePortId: 'shell-output-out', targetNodeId: 'receiver-1', targetPortId: 'receiver-result-in' },
      ],
      meta: undefined,
    }

    const flow = buildFlow(config, registry, z.undefined(), undefined)
    const instance = await flow.run()

    const shellNodeInstance = instance.nodes.find((node) => node.id === 'shell-1')
    const receiverNodeInstance = instance.nodes.find((node) => node.id === 'receiver-1')

    expect(shellNodeInstance).toBeDefined()
    expect(receiverNodeInstance).toBeDefined()

    const shellOutputs = unwrap(shellNodeInstance!.outputs)
    const shellResult = unwrap(shellOutputs[0]!.value) as {
      success: boolean
      stdout: string
      stderr: string
      exitCode: number
      timePassed: number
    }

    expect(shellResult.success).toBe(true)
    expect(shellResult.stdout.trim()).toBe('hello-shell-node')
    expect(shellResult.stderr).toBe('')
    expect(shellResult.exitCode).toBe(0)
    expect(shellResult.timePassed).toBeGreaterThanOrEqual(0)

    const receiverInputs = unwrap(receiverNodeInstance!.inputs)
    const propagatedResult = unwrap(receiverInputs[0]!.value) as typeof shellResult

    expect(receiverInputs[0]!.used).toBe(true)
    expect(propagatedResult).toEqual(shellResult)
  })

  test('returns a timeout failure result and still propagates it through the flow', async () => {
    const registry = new NodeRegistry()
    registry.register('built-in/shell', shellNode)
    registry.register('test/shell-start', createStartNodeDefinition('Start-Sleep -Milliseconds 300', 100))
    registry.register('test/shell-result-receiver', createResultReceiverDefinition())

    const config: FlowConfig<undefined> = {
      name: 'shell-node-timeout',
      nodes: [createStartNodeData(), createShellNodeData('powershell'), createReceiverNodeData()],
      edges: [
        { sourceNodeId: 'start-1', sourcePortId: 'start-command-out', targetNodeId: 'shell-1', targetPortId: 'shell-command-in' },
        { sourceNodeId: 'start-1', sourcePortId: 'start-timeout-out', targetNodeId: 'shell-1', targetPortId: 'shell-timeout-in' },
        { sourceNodeId: 'shell-1', sourcePortId: 'shell-output-out', targetNodeId: 'receiver-1', targetPortId: 'receiver-result-in' },
      ],
      meta: undefined,
    }

    const flow = buildFlow(config, registry, z.undefined(), undefined)
    const instance = await flow.run()

    const shellNodeInstance = instance.nodes.find((node) => node.id === 'shell-1')
    const receiverNodeInstance = instance.nodes.find((node) => node.id === 'receiver-1')

    expect(shellNodeInstance).toBeDefined()
    expect(receiverNodeInstance).toBeDefined()

    const shellOutputs = unwrap(shellNodeInstance!.outputs)
    const shellResult = unwrap(shellOutputs[0]!.value) as {
      success: boolean
      stdout: string
      stderr: string
      exitCode: number
      timePassed: number
    }

    expect(shellResult.success).toBe(false)
    expect(shellResult.stdout).toBe('')
    expect(shellResult.stderr).toContain('timed out after 100ms')
    expect(shellResult.exitCode).toBe(-1)
    expect(shellResult.timePassed).toBeGreaterThanOrEqual(100)

    const receiverInputs = unwrap(receiverNodeInstance!.inputs)
    const propagatedResult = unwrap(receiverInputs[0]!.value) as typeof shellResult

    expect(receiverInputs[0]!.used).toBe(true)
    expect(propagatedResult).toEqual(shellResult)
  })
})
