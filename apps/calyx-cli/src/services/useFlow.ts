import { createFlowBuilder } from 'calyx-flow'

export async function getFlowBuilder() {
  return createFlowBuilder({
    providerId: 'moonshotai-cn',
    modelId: 'kimi-k2.5'
  })
}