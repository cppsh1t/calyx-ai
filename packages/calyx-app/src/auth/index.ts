/**
 * Auth module — provider API-key storage, read, delete, and list.
 *
 * Credentials are persisted to `~/.local/share/calyx/auth.json` using
 * atomic write semantics and Unix 0600 permissions (owner read/write only).
 */

import type { AuthStorage } from '@/types/providers.ts'
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export type { AuthStorage }

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/**
 * Absolute path to the auth storage file.
 *
 * Uses the XDG Data directory convention: `~/.local/share/calyx/auth.json`.
 */
export const AUTH_FILE = join(homedir(), '.local', 'share', 'calyx', 'auth.json')

/**
 * Get the path to the auth storage file.
 *
 * @returns Absolute path to the auth JSON file.
 */
export async function getAuthPath(): Promise<string> {
  return AUTH_FILE
}

// ---------------------------------------------------------------------------
// Core I/O
// ---------------------------------------------------------------------------

/**
 * Read auth storage from disk.
 *
 * Returns an empty object when the file does not exist yet.
 *
 * @returns The parsed {@link AuthStorage} object.
 * @throws When the file exists but contains invalid JSON.
 */
export async function readAuth(): Promise<AuthStorage> {
  try {
    const content = await readFile(AUTH_FILE, 'utf-8')
    return JSON.parse(content) as AuthStorage
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse auth file: ${error.message}`)
    }
    throw error
  }
}

/**
 * Write auth storage to disk atomically.
 *
 * 1. Ensures the parent directory exists (recursive mkdir).
 * 2. Writes JSON to a temporary file.
 * 3. Sets file permissions to 0600 on Unix systems.
 * 4. Atomically renames the temp file to the target path.
 *
 * @param data - The {@link AuthStorage} object to persist.
 */
export async function writeAuth(data: AuthStorage): Promise<void> {
  const dir = dirname(AUTH_FILE)
  await mkdir(dir, { recursive: true })

  const tempPath = `${AUTH_FILE}.${process.pid}.tmp`
  const content = JSON.stringify(data, null, 2)
  await writeFile(tempPath, content, 'utf-8')

  if (process.platform !== 'win32') {
    await chmod(tempPath, 0o600)
  }

  await rename(tempPath, AUTH_FILE)
}

// ---------------------------------------------------------------------------
// Provider-key helpers
// ---------------------------------------------------------------------------

/**
 * Get the stored API key for a specific provider.
 *
 * @param providerId - Provider ID (e.g. `"anthropic"`, `"openai"`).
 * @returns The API key if found, otherwise `undefined`.
 */
export async function getProviderKey(providerId: string): Promise<string | undefined> {
  const auth = await readAuth()
  return auth[providerId]?.apiKey
}

/**
 * Store an API key for a specific provider.
 *
 * If an entry already exists its `createdAt` is preserved; otherwise a new
 * timestamp is recorded.
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
 * Remove the stored API key for a specific provider.
 *
 * @returns `true` if a key was removed, `false` if it didn't exist.
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
