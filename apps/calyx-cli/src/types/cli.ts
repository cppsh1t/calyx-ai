export type CliConfigRaw = {
  continue: boolean
  session?: string
  flow?: string
}

export type CliConfigParsed = {
  continue: boolean
  sessionId?: string
  flowName?: string
}

export function convertCliConfig(raw: CliConfigRaw): CliConfigParsed {
  return {
    continue: raw.continue,
    sessionId: raw.session,
    flowName: raw.flow,
  }
}
