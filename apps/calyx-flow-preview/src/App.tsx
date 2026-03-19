import { FlowEditor } from 'calyx-flow-editor'
import type { Edge, ExecutionContext, Flow, Node, NodeParameter, NodePort, Option } from 'calyx-flow/types'
import { useState } from 'react'
import { z } from 'zod'

const none: Option<never> = { type: 'None' }

const some = <T,>(value: T): Option<T> => ({ type: 'Some', value })

const createPort = (config: { id: string; name: string; description: string; direction: 'input' | 'output' }): NodePort => ({
  id: config.id,
  name: config.name,
  description: config.description,
  direction: config.direction,
  schema: z.string(),
  value: none,
})

const getParameterValue = (ctx: ExecutionContext, parameterName: string): string => {
  if (ctx.parameters.type !== 'Some') {
    return ''
  }

  const parameter = ctx.parameters.value.find((item) => item.name === parameterName)
  if (!parameter || parameter.value.type !== 'Some') {
    return ''
  }

  return String(parameter.value.value)
}

const createStartNode = (): Node => ({
  id: 'n-start',
  name: 'Start',
  description: 'Entry node for this basic editing case',
  position: { x: 60, y: 120 },
  symbol: some('start'),
  group: none,
  parameters: some<NodeParameter[]>([
    {
      name: 'message',
      description: 'Initial message payload',
      schema: z.string(),
      value: some('Hello Calyx'),
    },
  ]),
  inputs: none,
  outputs: some<NodePort[]>([
    createPort({
      id: 'out',
      name: 'out',
      description: 'Message output',
      direction: 'output',
    }),
  ]),
  executor: {
    async execute(ctx: ExecutionContext) {
      const message = getParameterValue(ctx, 'message') || 'Hello Calyx'

      if (ctx.outputs.type === 'Some') {
        const outputPort = ctx.outputs.value.find((port) => port.id === 'out')
        if (outputPort) {
          outputPort.value = some(message)
        }
      }

      ctx.emitter({
        type: 'node.executed',
        node: ctx.node,
        data: { message },
      })
    },
  },
})

const createEchoNode = (): Node => ({
  id: 'n-echo',
  name: 'Echo',
  description: 'Adds prefix and forwards text',
  position: { x: 360, y: 120 },
  symbol: none,
  group: none,
  parameters: some<NodeParameter[]>([
    {
      name: 'prefix',
      description: 'Prefix applied to incoming text',
      schema: z.string(),
      value: some('[preview]'),
    },
  ]),
  inputs: some<NodePort[]>([
    createPort({
      id: 'in',
      name: 'in',
      description: 'Incoming text',
      direction: 'input',
    }),
  ]),
  outputs: some<NodePort[]>([
    createPort({
      id: 'out',
      name: 'out',
      description: 'Processed text output',
      direction: 'output',
    }),
  ]),
  executor: {
    async execute(ctx: ExecutionContext) {
      const incomingText =
        ctx.inputs.type === 'Some'
          ? (() => {
              const inputPort = ctx.inputs.value.find((port) => port.id === 'in')
              if (!inputPort || inputPort.value.type !== 'Some') {
                return ''
              }
              return String(inputPort.value.value)
            })()
          : ''

      const prefix = getParameterValue(ctx, 'prefix')
      const outputText = `${prefix} ${incomingText}`.trim()

      if (ctx.outputs.type === 'Some') {
        const outputPort = ctx.outputs.value.find((port) => port.id === 'out')
        if (outputPort) {
          outputPort.value = some(outputText)
        }
      }

      ctx.emitter({
        type: 'node.processed',
        node: ctx.node,
        data: { outputText },
      })
    },
  },
})

const createEndNode = (): Node => ({
  id: 'n-end',
  name: 'End',
  description: 'Terminal node for inspecting the final input',
  position: { x: 660, y: 120 },
  symbol: none,
  group: none,
  parameters: none,
  inputs: some<NodePort[]>([
    createPort({
      id: 'in',
      name: 'in',
      description: 'Final input',
      direction: 'input',
    }),
  ]),
  outputs: none,
  executor: {
    async execute(ctx: ExecutionContext) {
      ctx.emitter({
        type: 'node.received',
        node: ctx.node,
        data: { inputs: ctx.inputs },
      })
    },
  },
})

const createDemoFlow = (): Flow => {
  const nodes: Node[] = [createStartNode(), createEchoNode(), createEndNode()]

  const edges: Edge[] = [
    {
      from: { nodeId: 'n-start', portId: 'out' },
      to: { nodeId: 'n-echo', portId: 'in' },
    },
    {
      from: { nodeId: 'n-echo', portId: 'out' },
      to: { nodeId: 'n-end', portId: 'in' },
    },
  ]

  return {
    name: 'basic-editing-case',
    nodes: some(nodes),
    edges: some(edges),
  }
}

export function App() {
  const [flow, setFlow] = useState<Flow>(() => createDemoFlow())
  const [saveCount, setSaveCount] = useState(0)

  const handleSave = (nextFlow: Flow): void => {
    setFlow(nextFlow)
    setSaveCount((count) => count + 1)
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
      }}
    >
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <strong>Basic Editing Case</strong>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Try dragging nodes, reconnecting edges, editing node parameters, then click Save Flow.
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#374151' }}>Saved {saveCount} time(s)</div>
      </header>

      <FlowEditor flow={flow} onSave={handleSave} />
    </div>
  )
}

export default App
