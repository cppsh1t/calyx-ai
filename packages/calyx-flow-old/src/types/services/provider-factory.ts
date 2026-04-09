import type { LanguageModel } from "ai"

export type Modality = {
  input: string[]
  output: string[]
}

export type Model = {
  id: string
  name: string
  family: string
  attachment: boolean
  reasoning: boolean
  tool_call: boolean
  interleaved: {
    field: string
  } | boolean,
  structured_output: boolean
  temperature: boolean
  knowledge: string //YYYY-mm
  release_date: string
  last_updated: string
  modalities: Modality
  open_weights: boolean
  cost: {
    input: number
    output: number
    cache_read: number
  },
  limit: {
    context: number
    output: number
  }
}

export type Provider = {
  id: string
  env: string[] //API_KEY ENV name
  npm: string //provider npm packcgae
  api: string //api web url
  name: string
  models: Record<string, Model>
}

export type ProviderFactory = {
  makeProvider: (providerId: string) => ProviderInstance
}

export type ProviderInstance = { languageModel: (modelId: string) => LanguageModel }
export type RawProviderFactory = (options?: any) => ProviderInstance