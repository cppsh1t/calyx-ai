import type { NodeDefinition } from '@/types'
import { None, Some } from '@/utils/structure'
import { z } from 'zod'
import type { NodeRegistry } from './registry.ts'

const anyAssertNodeDefinition: NodeDefinition = {
  name: 'Any Assert',
  description: 'Accepts any input value and forwards it as any without transforming the payload.',
  type: ['built-in', 'assert', 'any'],
  docs: [
    '# Any Assert',
    '',
    'This built-in node is a pass-through type assertion node.',
    'It accepts any input value and emits the same value as an `any`-typed output.',
    'The runtime payload is not modified.',
  ].join('\n'),
  group: 'built-in',
  parameters: None,
  inputs: Some([
    {
      id: 'input',
      name: 'input',
      description: 'Value to forward without any runtime transformation.',
      schema: z.any(),
      value: None,
    },
  ]),
  outputs: Some([
    {
      id: 'output',
      name: 'output',
      description: 'The same value, exposed as any.',
      schema: z.any(),
      value: None,
      requiredInputs: Some(['input']),
    },
  ]),
  executors: [
    {
      outputName: 'output',
      used: false,
      async func(ctx) {
        if (ctx.inputs.type === 'None') {
          return { continue: false, data: null }
        }

        const input = ctx.inputs.value.find((port) => port.name === 'input')
        if (!input || input.value.type === 'None') {
          return { continue: false, data: null }
        }

        return {
          continue: true,
          data: input.value.value,
        }
      },
    },
  ],
}

export { anyAssertNodeDefinition }
