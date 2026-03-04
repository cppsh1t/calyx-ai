import { createFlowBuilder } from 'calyx-flow'
import { getProviderKey } from '@/utils/auth'

export async function getFlowBuilder() {
  return createFlowBuilder(getProviderKey)
}