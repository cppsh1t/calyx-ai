import { Some, unwrap, type NodeDefinition } from 'calyx-flow'
import { z } from 'zod'

const scriptJsNode: NodeDefinition = {
  name: 'Script JavaScript Node',
  type: [],
  group: 'utility',
  description: 'A node that executes a JavaScript code snippet',
  docs: '',
  parameters: Some([
    {
      name: 'script',
      description: 'The JavaScript code to execute',
      schema: z.string(),
    },
  ]),
  inputs: Some([
    {
      name: 'input',
      description: 'The input data for the script',
      schema: z.unknown(),
    },
  ]),
  outputs: Some([
    {
      name: 'output',
      description: 'The output of the executed JavaScript code',
      requiredInputs: Some(['input']),
      schema: z.any(),
      executor: async (ctx) => {
        if (ctx.signal.aborted) {
          return { continue: false, data: undefined }
        }

        const input = unwrap(ctx.inputs).find((input) => input.name === 'input')!
        const inputData = unwrap(input.value)
        const script = unwrap(ctx.parameters).find((param) => param.name === 'script')!

        let fn: Function
        try {
          fn = new Function('inputData', unwrap(script.value))
        } catch (error) {
          throw new Error(`Error in script syntax: ${(error as Error).message}`)
        }

        const abortPromise = new Promise<never>((_, reject) => {
          const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
          ctx.signal.addEventListener('abort', onAbort, { once: true })
        })

        try {
          const result = await Promise.race([Promise.resolve(fn(inputData, ctx.signal)), abortPromise])
          return { continue: true, data: result }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return { continue: false, data: undefined }
          }
          throw error
        }
      },
    },
  ]),
}

export { scriptJsNode }