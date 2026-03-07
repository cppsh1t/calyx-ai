#!/usr/bin/env bun
/**
 * Command Code Generator for Commander.js
 *
 * This script generates boilerplate code for Commander.js commands.
 * It supports options, arguments, and customizable templates.
 *
 * Usage:
 *   bun run generate-command.ts <command-name> [options]
 *
 * Examples:
 *   bun run generate-command.ts deploy
 *   bun run generate-command.ts build --options output,watch,minify
 *   bun run generate-command.ts login --args username --required-opts password
 */

// @ts-ignore - Bun types

// Type declarations for Node globals
declare const process: {
  argv: string[]
  exit: (code?: number) => never
}

interface GenerateOptions {
  commandName: string
  options?: string[]
  args?: string[]
  requiredOpts?: string[]
  description?: string
  outputFile?: string
}

/**
 * Generate command code template
 */
function generateCommandCode(opts: GenerateOptions): string {
  const { commandName, options = [], args = [], requiredOpts = [], description = '' } = opts

  const indent = '  '
  let code = `// Generated command: ${commandName}\n\n`

  // Command definition
  code += `program\n`
  code += `${indent}.command('${commandName}`

  // Add arguments
  if (args.length > 0) {
    args.forEach((arg, i) => {
      const isRequired = !arg.startsWith('[')
      if (i === 0 || isRequired) {
        code += ` <${arg}>`
      } else {
        code += ` [${arg.replace('[', '').replace(']', '')}]`
      }
    })
  }

  code += "')\n"

  // Add description
  if (description) {
    code += `${indent}.description('${description}')\n`
  } else {
    code += `${indent}.description('${commandName} command')\n`
  }

  // Add options
  options.forEach((opt) => {
    const parts = opt.split(':')
    const optName = parts[0]
    const optDesc = parts[1] || `${optName} option`
    const hasShort = optName.length === 1

    if (hasShort) {
      code += `${indent}.option('-${optName}, --${optName} <value>', '${optDesc}')\n`
    } else {
      // Convert camelCase to kebab-case
      const kebabCase = optName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      const shortName = optName[0]
      code += `${indent}.option('-${shortName}, --${kebabCase} <value>', '${optDesc}')\n`
    }
  })

  // Add required options
  requiredOpts.forEach((opt) => {
    const parts = opt.split(':')
    const optName = parts[0]
    const optDesc = parts[1] || `${optName} (required)`
    const hasShort = optName.length === 1

    if (hasShort) {
      code += `${indent}.requiredOption('-${optName}, --${optName} <value>', '${optDesc}')\n`
    } else {
      const kebabCase = optName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      const shortName = optName[0]
      code += `${indent}.requiredOption('-${shortName}, --${kebabCase} <value>', '${optDesc}')\n`
    }
  })

  // Action handler
  code += `${indent}.action((`

  // Action parameters
  const params: string[] = []
  args.forEach((arg) => {
    const cleanArg = arg.replace('[', '').replace(']', '')
    params.push(`${cleanArg}: string`)
  })

  // Options parameter
  const allOpts = [...options, ...requiredOpts]
  if (allOpts.length > 0) {
    const optType = allOpts.map((o) => `${o.split(':')[0]}?: string`).join('; ')
    params.push(`options: { ${optType} }`)
  } else {
    params.push(`options: Record<string, unknown>`)
  }

  code += params.join(', ')
  code += `) => {\n`
  code += `${indent}${indent}// TODO: Implement ${commandName} logic\n`
  code += `${indent}${indent}console.log('Executing ${commandName}', { `
  code += args.map((a) => a.replace('[', '').replace(']', '')).join(', ')
  code += `, options });\n`
  code += `${indent}});\n\n`

  return code
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): GenerateOptions {
  const opts: GenerateOptions = {
    commandName: '',
    options: [],
    args: [],
    requiredOpts: [],
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg.startsWith('--')) {
      const flag = arg.slice(2)
      const value = args[i + 1]

      switch (flag) {
        case 'options':
        case 'opts':
          if (value && !value.startsWith('--')) {
            opts.options = value.split(',')
            i++
          }
          break

        case 'args':
          if (value && !value.startsWith('--')) {
            opts.args = value.split(',')
            i++
          }
          break

        case 'required-opts':
        case 'required':
          if (value && !value.startsWith('--')) {
            opts.requiredOpts = value.split(',')
            i++
          }
          break

        case 'description':
        case 'desc':
          if (value && !value.startsWith('--')) {
            opts.description = value
            i++
          }
          break

        case 'output':
        case 'out':
        case 'o':
          if (value && !value.startsWith('--')) {
            opts.outputFile = value
            i++
          }
          break

        default:
          if (!opts.commandName) {
            opts.commandName = flag
          }
          break
      }
    } else if (!opts.commandName && !arg.startsWith('-')) {
      opts.commandName = arg
    }
  }

  return opts
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
Command Code Generator for Commander.js

Usage:
  bun run generate-command.ts <command-name> [options]

Arguments:
  command-name          Name of the command to generate

Options:
  --options, --opts     Comma-separated list of option names
                        Example: --options output,watch,minify
  --args                Comma-separated list of argument names
                        Use [arg] for optional arguments
                        Example: --args file,[output]
  --required-opts       Comma-separated list of required options
                        Example: --required-opts username,password
  --description, --desc Description for the command
  --output, --out, -o   Output file path (default: stdout)

Examples:
  # Simple command
  bun run generate-command.ts deploy

  # Command with options
  bun run generate-command.ts build --options output,watch,minify

  # Command with arguments and required options
  bun run generate-command.ts login --args username --required-opts password

  # Command with everything
  bun run generate-command.ts process --args file,[output] --options verbose --required-ops config --desc "Process files"

  # Save to file
  bun run generate-command.ts deploy --options env,version --output deploy-command.ts
`)
    process.exit(0)
  }

  const opts = parseArgs(args)

  if (!opts.commandName) {
    console.error('Error: Command name is required')
    process.exit(1)
  }

  // Generate code
  const code = generateCommandCode(opts)

  // Output
  if (opts.outputFile) {
    // @ts-ignore
    await Bun.write(opts.outputFile, code)
    console.log(`✓ Generated command code: ${opts.outputFile}`)
  } else {
    console.log('\n' + code)
  }
}

// Run if executed directly
// @ts-ignore
if (import.meta.main) {
  main().catch((error: Error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
}

export { generateCommandCode }
