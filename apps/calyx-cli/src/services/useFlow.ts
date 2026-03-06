import { createFlowBuilder } from 'calyx-flow'

export async function getFlowBuilder() {
  return createFlowBuilder({
    providerId: 'deepseek',
    modelId: 'deepseek-reasoner'
  })
}