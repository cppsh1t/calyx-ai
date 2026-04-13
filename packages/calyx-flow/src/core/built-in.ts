import type { NodeDefinition } from '@/types'
import { Some, unwrap } from '@/utils/structure'
import { z } from 'zod'

const systemContextNode: NodeDefinition = {
  type: [],
  name: 'SystemContext',
  group: 'agent',
  description: 'Provides system context information to agent.',
  docs: `## SystemContext

Merges a template string with context data to produce a final system prompt.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| \`template\` | \`string\` | ✅ | Template string using \`{{key}}\` syntax to reference context variables |

### Inputs

| Name | Type | Description |
|------|------|-------------|
| \`context\` | \`Record<string, unknown>\` | Key-value pairs providing the context data |

### Outputs

| Name | Type | Description |
|------|------|-------------|
| \`systemPrompt\` | \`string\` | The fully rendered system prompt |

### Template Syntax

Use \`{{variableName}}\` to insert context values into the template:

\`\`\`
You are a {{role}} specializing in {{expertise}}.
Current time: {{time}}.
\`\`\`

- Variable names are case-sensitive
- Undefined variables are left as-is (e.g. \`{{missing}}\`)
- String values are inserted directly; non-string values are serialized via \`JSON.stringify\`
- Only top-level keys are supported — nested paths are not resolved

### Example

**Parameters**:
- \`template\`: \`"You are a {{role}}. Your task is to {{task}}."\`

**Inputs**:
- \`context\`: \`{ role: "translation assistant", task: "translate English to Chinese" }\`

**Output**:
- \`systemPrompt\`: \`"You are a translation assistant. Your task is to translate English to Chinese."\`
`,
  parameters: Some([
    {
      name: 'template',
      schema: z.string(),
      description: 'The template string for system context. You can use {{variableName}} to access the variable in the context.',
    },
  ]),
  inputs: Some([
    {
      name: 'context',
      description: 'The system context object.',
      schema: z.record(z.string(), z.unknown()),
    },
  ]),
  outputs: Some([
    {
      name: 'systemPrompt',
      description: 'The generated system prompt based on the template and context.',
      schema: z.string(),
      requiredInputs: Some(['context']),
      executor: async (ctx) => {
        if (ctx.signal.aborted) return { continue: false, data: '' }

        // Extract template from parameters
        let template = ''
        const parameters = unwrap(ctx.parameters)

        const param = parameters.find((p) => p.name === 'template')
        if (param) {
          template = unwrap(param.value) as string
        } else {
          throw new Error('Template parameter is required for SystemContext node.')
        }

        // Extract context from inputs
        let context: Record<string, unknown> = {}
        const inputs = unwrap(ctx.inputs)
        const input = inputs.find((i) => i.name === 'context')
        if (input) context = unwrap(input.value) as Record<string, unknown>

        // Render template: replace {{key}} with context values
        const rendered = template.replace(/\{\{([^}]+)\}\}/g, (_, rawKey: string) => {
          const key = rawKey.trim()
          const val = context[key]
          if (val === undefined) return `{{${key}}}`
          return typeof val === 'string' ? val : JSON.stringify(val)
        })

        return { continue: true, data: rendered }
      },
    },
  ]),
}

export { systemContextNode }
