import { spawn } from 'bun'
import { Some, unwrap, type NodeDefinition } from 'calyx-flow'
import { z } from 'zod'

function getShellCommand(shellEnvironment: string, command: string): string[] {
  switch (shellEnvironment) {
    case 'cmd':
      return ['cmd', '/c', command]
    case 'powershell':
    case 'pwsh':
      return [shellEnvironment, '-NoProfile', '-Command', command]
    case 'bash':
    case 'zsh':
      return [shellEnvironment, '-lc', command]
    case 'sh':
      return ['sh', '-c', command]
    default:
      return [shellEnvironment, '-c', command]
  }
}

async function readProcessStream(stream: ReadableStream<Uint8Array> | null | undefined): Promise<string> {
  if (!stream) {
    return ''
  }

  return await new Response(stream).text()
}

function getAbortMessage(reason: unknown, fallback: string): string {
  if (reason instanceof Error) {
    return reason.message
  }

  if (typeof reason === 'string' && reason.length > 0) {
    return reason
  }

  return fallback
}

const shellNode: NodeDefinition = {
  name: 'Shell Node',
  type: [],
  group: 'utility',
  description: 'A node that executes a shell command',
  docs: '',
  parameters: Some([
    {
      name: 'shell environment',
      description: 'The shell environment to use for executing the command (e.g., bash, sh, cmd, powershell)',
      schema: z.string(),
    },
  ]),
  inputs: Some([
    {
      name: 'command',
      description: 'The shell command to execute',
      schema: z.string(),
    },
    {
      name: 'timeout',
      description: 'The maximum time (in milliseconds) to allow the command to run before terminating it',
      schema: z.number().int().positive(),
    },
  ]),
  outputs: Some([
    {
      name: 'output',
      description: 'The standard output from the executed command',
      schema: z.object({
        success: z.boolean(),
        stdout: z.string(),
        stderr: z.string(),
        exitCode: z.number().int(),
        timePassed: z.number().int().nonnegative(),
      }),
      requiredInputs: Some(['command', 'timeout']),
      executor: async (ctx) => {
        if (ctx.signal.aborted) {
          return {
            continue: false,
            data: {
              success: false,
              stdout: '',
              stderr: getAbortMessage(ctx.signal.reason, 'Execution aborted before the shell command started.'),
              exitCode: -1,
              timePassed: 0,
            },
          }
        }

        if (ctx.parameters.type === 'None') {
          throw new Error('Shell Node requires parameter definitions at runtime.')
        }

        if (ctx.inputs.type === 'None') {
          throw new Error('Shell Node requires input definitions at runtime.')
        }

        const parameters = unwrap(ctx.parameters)
        const inputs = unwrap(ctx.inputs)

        const shellParameter = parameters.find((parameter) => parameter.name === 'shell environment')
        const commandInput = inputs.find((input) => input.name === 'command')
        const timeoutInput = inputs.find((input) => input.name === 'timeout')

        if (!shellParameter || shellParameter.value.type === 'None') {
          throw new Error('Shell Node requires the "shell environment" parameter.')
        }

        if (!commandInput || commandInput.value.type === 'None') {
          throw new Error('Shell Node requires the "command" input.')
        }

        if (!timeoutInput || timeoutInput.value.type === 'None') {
          throw new Error('Shell Node requires the "timeout" input.')
        }

        const shellEnvironment = unwrap(shellParameter.value)
        const command = unwrap(commandInput.value)
        const timeout = unwrap(timeoutInput.value)

        const startedAt = Date.now()
        const abortController = new AbortController()
        const onAbort = () => abortController.abort(ctx.signal.reason)
        ctx.signal.addEventListener('abort', onAbort, { once: true })

        const timeoutId = setTimeout(() => {
          abortController.abort(new Error(`Shell command timed out after ${timeout}ms.`))
        }, timeout)

        try {
          const subprocess = spawn(getShellCommand(shellEnvironment, command), {
            stdin: 'ignore',
            stdout: 'pipe',
            stderr: 'pipe',
            signal: abortController.signal,
          })

          const [stdout, stderr, exitCode] = await Promise.all([readProcessStream(subprocess.stdout), readProcessStream(subprocess.stderr), subprocess.exited])

          const aborted = abortController.signal.aborted
          const resolvedStderr =
            aborted && stderr.length === 0 ? getAbortMessage(abortController.signal.reason, 'Shell command execution was aborted.') : stderr

          return {
            continue: true,
            data: {
              success: exitCode === 0 && !aborted,
              stdout,
              stderr: resolvedStderr,
              exitCode: aborted ? -1 : exitCode,
              timePassed: Date.now() - startedAt,
            },
          }
        } catch (error) {
          const stderr = error instanceof Error ? error.message : String(error)

          return {
            continue: true,
            data: {
              success: false,
              stdout: '',
              stderr,
              exitCode: -1,
              timePassed: Date.now() - startedAt,
            },
          }
        } finally {
          clearTimeout(timeoutId)
          ctx.signal.removeEventListener('abort', onAbort)
        }
      },
    },
  ]),
}

export { shellNode }
