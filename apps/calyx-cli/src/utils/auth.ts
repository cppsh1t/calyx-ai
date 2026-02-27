import type { AuthStorage } from '@/types/providers.ts'
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/**
 * Path to auth storage file
 * Uses XDG Data directory: ~/.local/share/calyx/auth.json
 */
const AUTH_FILE = join(homedir(), '.local', 'share', 'calyx', 'auth.json')

/**
 * Get the path to the auth storage file
 * @returns Absolute path to ~/.local/share/calyx/auth.json
 */
export async function getAuthPath(): Promise<string> {
  return AUTH_FILE
}

/**
 * Read auth storage from disk
 * Returns empty object if file doesn't exist
 * @returns AuthStorage object
 * @throws Error if file exists but contains invalid JSON
 */
export async function readAuth(): Promise<AuthStorage> {
  try {
    const content = await readFile(AUTH_FILE, 'utf-8')
    return JSON.parse(content) as AuthStorage
  } catch (error) {
    // File doesn't exist - return empty object
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {}
    }
    // JSON parse error - rethrow
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse auth file: ${error.message}`)
    }
    throw error
  }
}

/**
 * Write auth storage to disk atomically
 * Creates parent directories if needed
 * Sets file permissions to 0600 on Unix systems
 * @param data - AuthStorage object to write
 */
export async function writeAuth(data: AuthStorage): Promise<void> {
  // Ensure directory exists
  const dir = dirname(AUTH_FILE)
  await mkdir(dir, { recursive: true })

  // Write to temp file first (atomic write)
  const tempPath = `${AUTH_FILE}.${process.pid}.tmp`
  const content = JSON.stringify(data, null, 2)
  await writeFile(tempPath, content, 'utf-8')

  // Set file permissions to 0600 (owner read/write only) on Unix
  if (process.platform !== 'win32') {
    await chmod(tempPath, 0o600)
  }

  // Atomically rename temp file to target
  await rename(tempPath, AUTH_FILE)
}

/**
 * Get API key for a specific provider
 * @param providerId - Provider ID (e.g., 'anthropic', 'openai')
 * @returns API key if found, undefined otherwise
 */
export async function getProviderKey(providerId: string): Promise<string | undefined> {
  const auth = await readAuth()
  return auth[providerId]?.apiKey
}

/**
 * Store API key for a specific provider
 * @param providerId - Provider ID (e.g., 'anthropic', 'openai')
 * @param apiKey - API key to store
 */
export async function setProviderKey(providerId: string, apiKey: string): Promise<void> {
  const auth = await readAuth()
  auth[providerId] = {
    apiKey,
    createdAt: auth[providerId]?.createdAt ?? Date.now(),
    lastUsed: Date.now(),
  }
  await writeAuth(auth)
}

/**
 * Remove API key for a specific provider
 * @param providerId - Provider ID to remove
 * @returns true if key was removed, false if it didn't exist
 */
export async function removeProviderKey(providerId: string): Promise<boolean> {
  const auth = await readAuth()
  if (!(providerId in auth)) {
    return false
  }
  delete auth[providerId]
  await writeAuth(auth)
  return true
}
