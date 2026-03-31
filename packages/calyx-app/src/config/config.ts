import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const DATA_DIR = join(homedir(), '.local', 'share', 'calyx')

export const CACHE_DIR = join(DATA_DIR, 'cache')

export async function ensureCacheDir(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true })
}

export type Config = Record<string, unknown>

export enum ConfigErrorType {
  PARSE_ERROR = 'PARSE_ERROR',
  WRITE_ERROR = 'WRITE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
}

export class ConfigError extends Error {
  constructor(
    public readonly type: ConfigErrorType,
    message: string,
    public readonly path?: string
  ) {
    super(message)
    this.name = 'ConfigError'
  }
}

export function getUserConfigPath(): string {
  return join(homedir(), '.calyx', 'config.json')
}

export function getProjectConfigPath(): string {
  return join(process.cwd(), '.calyx', 'config.json')
}

export async function configExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** @throws {ConfigError} PARSE_ERROR if JSON is invalid, NOT_FOUND if file missing. */
export async function readConfig(path: string): Promise<Config> {
  try {
    const content = await readFile(path, 'utf-8')
    return JSON.parse(content) as Config
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ConfigError(ConfigErrorType.PARSE_ERROR, `Failed to parse JSON configuration file: ${error.message}`, path)
    }
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new ConfigError(ConfigErrorType.NOT_FOUND, `Configuration file does not exist: ${path}`, path)
    }
    throw error
  }
}

/** Atomically writes config via temp-file + rename. @throws {ConfigError} WRITE_ERROR on failure. */
export async function writeConfig(path: string, data: Config): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true })
    const tempPath = `${path}.${process.pid}.tmp`
    await writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8')
    await rename(tempPath, path)
  } catch (error) {
    throw new ConfigError(ConfigErrorType.WRITE_ERROR, `Failed to write configuration file: ${error instanceof Error ? error.message : String(error)}`, path)
  }
}

export async function initUserConfig(): Promise<'created' | 'exists'> {
  const userConfigPath = getUserConfigPath()
  if (await configExists(userConfigPath)) {
    return 'exists'
  }
  await writeConfig(userConfigPath, { configVersion: '0.1' })
  return 'created'
}

export async function initProjectConfig(): Promise<'created' | 'exists'> {
  const projectConfigPath = getProjectConfigPath()
  if (await configExists(projectConfigPath)) {
    return 'exists'
  }
  await writeConfig(projectConfigPath, { configVersion: '0.1' })
  return 'created'
}

/** @throws {ConfigError} NOT_FOUND if user config does not exist. */
export async function copyUserToProjectConfig(): Promise<void> {
  const userConfigPath = getUserConfigPath()
  if (!(await configExists(userConfigPath))) {
    throw new ConfigError(ConfigErrorType.NOT_FOUND, `User configuration does not exist: ${userConfigPath}`, userConfigPath)
  }
  const userConfig = await readConfig(userConfigPath)
  await writeConfig(getProjectConfigPath(), userConfig)
}
