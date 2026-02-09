export type AgentMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AgentTool = {
  name: string
  execute: (input: string) => Promise<string> | string
}

export class CalyxAgent {
  tools: Record<string, AgentTool> = {}

  addTool(tool: AgentTool) {
    this.tools[tool.name] = tool
  }

  async run(messages: AgentMessage[]): Promise<string> {
    const last = messages[messages.length - 1]
    if (!last) return ''
    const tool = this.tools[last.content]
    if (tool) {
      const res = await tool.execute(last.content)
      return typeof res === 'string' ? res : await res
    }
    return last.content
  }
}
