import { Some, unwrap, type NodeDefinition } from 'calyx-flow'
import { z } from 'zod'

const transpiler = new Bun.Transpiler({
  loader: 'ts',
  target: 'bun',
})

const scriptTsNode: NodeDefinition = {
  name: 'Script TypeScript Node',
  type: [],
  group: 'utility',
  description: 'A node that transpiles and executes a TypeScript code snippet',
  docs: '',
  parameters: Some([
    {
      name: 'script',
      description: 'The TypeScript code to transpile and execute',
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
      description: 'The output of the transpiled and executed TypeScript code',
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
          const transpiledScript = transpiler.transformSync(unwrap(script.value))
          fn = new Function('inputData', transpiledScript)
        } catch (error) {
          throw new Error(`Error in TypeScript syntax: ${(error as Error).message}`)
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

export { scriptTsNode }
