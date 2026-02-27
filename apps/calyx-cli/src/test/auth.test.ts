import { getProviderKey, readAuth, removeProviderKey, setProviderKey, writeAuth } from '@/utils/auth.ts'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, renameSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const AUTH_FILE = join(homedir(), '.local', 'share', 'calyx', 'auth.json')

describe('auth', () => {
  // Backup and restore auth file
  const backupFile = `${AUTH_FILE}.test-backup`

  beforeEach(() => {
    if (existsSync(AUTH_FILE)) {
      rmSync(backupFile, { force: true })
      renameSync(AUTH_FILE, backupFile)
    }
    rmSync(AUTH_FILE, { force: true })
  })

  afterEach(() => {
    rmSync(AUTH_FILE, { force: true })
    if (existsSync(backupFile)) {
      renameSync(backupFile, AUTH_FILE)
    }
  })

  test('readAuth returns empty object for missing file', async () => {
    const auth = await readAuth()
    expect(auth).toEqual({})
  })

  test('writeAuth and readAuth roundtrip', async () => {
    const testData = { anthropic: { apiKey: 'sk-test', createdAt: 12345 } }
    await writeAuth(testData)
    const result = await readAuth()
    expect(result).toEqual(testData)
  })

  test('setProviderKey stores key with metadata', async () => {
    await setProviderKey('openai', 'sk-openai-key')
    const key = await getProviderKey('openai')
    expect(key).toBe('sk-openai-key')

    const auth = await readAuth()
    expect(auth['openai']?.createdAt).toBeDefined()
    expect(auth['openai']?.lastUsed).toBeDefined()
  })

  test('getProviderKey returns undefined for missing provider', async () => {
    const key = await getProviderKey('nonexistent')
    expect(key).toBeUndefined()
  })

  test('removeProviderKey returns false for missing provider', async () => {
    const result = await removeProviderKey('nonexistent')
    expect(result).toBe(false)
  })

  test('removeProviderKey removes existing key', async () => {
    await setProviderKey('anthropic', 'sk-test')
    const result = await removeProviderKey('anthropic')
    expect(result).toBe(true)

    const key = await getProviderKey('anthropic')
    expect(key).toBeUndefined()
  })
})
