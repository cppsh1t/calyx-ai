# calyx-flow

A lightweight workflow library for node-edge flow construction and async runtime execution.

## Features

- Build a `Flow` from a plain object + `NodeRegistry`
- Start execution from a node `symbol`
- Parallel scheduling (multiple executors can run at once)
- Input/output schema validation on propagation
- External cancellation with `AbortSignal`
- Real-time runtime events from executor via `ctx.emitter`

## Main APIs

- `createFlow(flowObject, registry, emitter?) => Flow`
- `runFlow(flow, startSymbol, options?) => Promise<{ status: 'completed' | 'aborted' }>`

## Event Emitter

The optional emitter you pass to `createFlow` receives:

```ts
type NodeEmitterEvent = {
  type: string
  node: Node
  data: any
}
```

Executors can emit runtime messages through `ctx.emitter(...)`.

## Quick Start

```ts
import z from 'zod'
import { createFlow, runFlow } from 'calyx-flow'
import { NodeRegistry } from 'calyx-flow/core'

const registry = new NodeRegistry()

registry.register('demo/start', {
  name: 'Start',
  description: 'Start node',
  position: { x: 0, y: 0 },
  symbol: { type: 'Some', value: 'start' },
  group: { type: 'None' },
  parameters: { type: 'None' },
  inputs: { type: 'None' },
  outputs: {
    type: 'Some',
    value: [
      {
        id: 'out',
        name: 'out',
        schema: z.string(),
        direction: 'output',
        description: 'output text',
        value: { type: 'None' },
      },
    ],
  },
  executor: {
    async execute(ctx) {
      if (ctx.outputs.type === 'Some') {
        const out = ctx.outputs.value.find((p) => p.id === 'out')
        if (out) {
          out.value = { type: 'Some', value: 'hello from start' }
        }
      }

      ctx.emitter({
        type: 'node.executed',
        node: ctx.node,
        data: { ok: true },
      })
    },
  },
})

registry.register('demo/end', {
  name: 'End',
  description: 'End node',
  position: { x: 240, y: 0 },
  symbol: { type: 'None' },
  group: { type: 'None' },
  parameters: { type: 'None' },
  inputs: {
    type: 'Some',
    value: [
      {
        id: 'in',
        name: 'in',
        schema: z.string(),
        direction: 'input',
        description: 'input text',
        value: { type: 'None' },
      },
    ],
  },
  outputs: { type: 'None' },
  executor: {
    async execute(ctx) {
      ctx.emitter({
        type: 'node.received',
        node: ctx.node,
        data: ctx.inputs,
      })
    },
  },
})

const flowObject = {
  name: 'demo-flow',
  nodes: [
    {
      id: 'n-start',
      key: 'demo/start',
      name: 'Start',
      description: 'start runtime node',
      position: { x: 0, y: 0 },
    },
    {
      id: 'n-end',
      key: 'demo/end',
      name: 'End',
      description: 'end runtime node',
      position: { x: 240, y: 0 },
    },
  ],
  edges: [
    {
      from: { nodeId: 'n-start', portId: 'out' },
      to: { nodeId: 'n-end', portId: 'in' },
    },
  ],
}

const flow = createFlow(flowObject, registry, (event) => {
  console.log('[event]', event.type, event.node.name, event.data)
})

const controller = new AbortController()
const result = await runFlow(flow, 'start', { signal: controller.signal })
console.log(result.status)
```

## Runtime Notes

- Scheduling is parallel by design
- Each valid input activation triggers one execution
- Port write conflicts are user-defined behavior (no internal lock)
- `AbortController` stops scheduling new tasks; executors can also read `ctx.abort`
