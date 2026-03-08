import { getProviders } from '@/utils/models-api'
import { createFlowBuilder } from 'calyx-flow'

export async function getFlowBuilder() {
  const providerConfig = await getProviders()
  return createFlowBuilder(providerConfig)
}