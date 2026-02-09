import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/**
 * Configuration file data type
 */
export type Config = Record<string, unknown>

/**
 * Configuration error types
 */
export enum ConfigErrorType {
  PARSE_ERROR = 'PARSE_ERROR',
  WRITE_ERROR = 'WRITE_ERROR',
  EXISTS = 'EXISTS',
}

/**
 * Custom configuration error class
 */
export class ConfigError extends Error {
  constructor(
    public type: ConfigErrorType,
    message: string,
    public path?: string
  ) {
    super(message)
    this.name = 'ConfigError'
  }
}

/**
 * Get user-level configuration path
 * @returns Absolute path to ~/.calyx/models.json
 */
export function getUserConfigPath(): string {
  return join(homedir(), '.calyx', 'models.json')
}

/**
 * Get project-level configuration path
 * @returns Absolute path to ./.calyx/models.json (relative to process.cwd())
 */
export function getProjectConfigPath(): string {
  return join(process.cwd(), '.calyx', 'models.json')
}

/**
 * Check if configuration file exists
 * @param path - Absolute path to configuration file
 * @returns true if file exists, false otherwise
 */
export async function configExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Read and parse configuration file
 * @param path - Absolute path to configuration file
 * @returns Parsed configuration object
 * @throws {ConfigError} If file doesn't exist or JSON is invalid
 */
export async function readConfig(path: string): Promise<Config> {
  try {
    const content = await readFile(path, 'utf-8')
    const config = JSON.parse(content) as Config
    return config
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ConfigError(ConfigErrorType.PARSE_ERROR, `Failed to parse JSON configuration file: ${error.message}`, path)
    }
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new ConfigError(ConfigErrorType.EXISTS, `Configuration file does not exist: ${path}`, path)
    }
    throw error
  }
}

/**
 * Write configuration file atomically
 * @param path - Absolute path to configuration file
 * @param data - Configuration object to write
 * @throws {ConfigError} If write operation fails
 */
export async function writeConfig(path: string, data: Config): Promise<void> {
  try {
    // Ensure directory exists
    const dir = dirname(path)
    await mkdir(dir, { recursive: true })

    // Write to temporary file first
    const tempPath = `${path}.${process.pid}.tmp`
    const content = JSON.stringify(data, null, 2)
    await writeFile(tempPath, content, 'utf-8')

    // Atomically rename temp file to target file
    await rename(tempPath, path)
  } catch (error) {
    throw new ConfigError(ConfigErrorType.WRITE_ERROR, `Failed to write configuration file: ${error instanceof Error ? error.message : String(error)}`, path)
  }
}

/**
 * Check if running in CI environment
 * @returns true if CI environment is detected
 */
function isCIEnvironment(): boolean {
  const isCI = process.env.CI === 'true' || process.env.CI === '1'
  const isTTY = process.stdout.isTTY
  return isCI || !isTTY
}

/**
 * Initialize user-level configuration
 * Creates empty config file at ~/.calyx/models.json if it doesn't exist
 * Skips initialization in CI/non-interactive environments
 * @returns Path to user config file
 */
export async function initUserConfig(): Promise<string> {
  const userConfigPath = getUserConfigPath()

  // Skip initialization in CI environment
  if (isCIEnvironment()) {
    console.log('Skipping config initialization in non-interactive environment')
    return userConfigPath
  }

  // Check if config already exists
  const exists = await configExists(userConfigPath)
  if (exists) {
    return userConfigPath
  }

  // Create empty config
  await writeConfig(userConfigPath, {})
  console.log(`Created user configuration at: ${userConfigPath}`)

  return userConfigPath
}

/**
 * Initialize project-level configuration
 * Creates empty config file at ./.calyx/models.json if it doesn't exist
 * @returns Path to project config file
 */
export async function initProjectConfig(): Promise<string> {
  const projectConfigPath = getProjectConfigPath()

  // Check if config already exists
  const exists = await configExists(projectConfigPath)
  if (exists) {
    return projectConfigPath
  }

  // Create empty config
  await writeConfig(projectConfigPath, {})
  console.log(`Created project configuration at: ${projectConfigPath}`)

  return projectConfigPath
}

/**
 * Copy user configuration to project configuration
 * Reads ~/.calyx/models.json and writes to ./.calyx/models.json
 * @throws {ConfigError} If user config doesn't exist or write fails
 */
export async function copyUserToProjectConfig(): Promise<void> {
  const userConfigPath = getUserConfigPath()
  const projectConfigPath = getProjectConfigPath()

  // Check if user config exists
  const userConfigExists = await configExists(userConfigPath)
  if (!userConfigExists) {
    throw new ConfigError(ConfigErrorType.EXISTS, `User configuration does not exist: ${userConfigPath}`, userConfigPath)
  }

  // Read user config
  const userConfig = await readConfig(userConfigPath)

  // Write to project config
  await writeConfig(projectConfigPath, userConfig)

  console.log(`Copied user configuration to project: ${projectConfigPath}`)
}
