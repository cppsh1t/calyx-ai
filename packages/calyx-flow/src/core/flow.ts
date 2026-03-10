import { buildProviderFactory } from '@/services/provider-factory'
import type { FlowBuilder, FlowConfig, Message, Tool } from '@/types/core/flow'
import type { Provider } from '@/types/services/provider-factory'
import { formatHistory } from '@/utils/messageConverter'
import { streamText, type LanguageModel } from 'ai'

class Flow {
  private model: LanguageModel
  private systemPrompt: string
  private tools: Tool[]
  private history: Message[]
  private xmlTagBuffer: string = ''
  private checkHead: boolean = true

  public constructor(model: LanguageModel, systemPrompt: string, history?: Message[], tools?: Tool[]) {
    this.model = model
    this.systemPrompt = systemPrompt
    this.tools = tools ?? []
    this.history = history ?? []
  }

  private async runLoop() {}

  public async run() {
    const streamResult = streamText({
      model: this.model,
      messages: formatHistory(this.systemPrompt, this.history),
    })
    for await (const chunk of streamResult.fullStream) {
      
    }
  }
}

async function createFlowBuilder(providerConfig: Record<string, Provider>): Promise<FlowBuilder> {
  const providerFactory = buildProviderFactory(providerConfig)

  const builder: FlowBuilder = {
    //@ts-ignore
    async build(config: FlowConfig) {
      const provider = await providerFactory.makeProvider(config.providerId)
      const model = provider.languageModel(config.modelId)
      return new Flow(model, config.systemPrompt, config.history, config.tools)
    },
  }
  return builder
}

export { createFlowBuilder, Flow }
