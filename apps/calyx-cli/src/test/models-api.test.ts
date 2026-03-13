import type { CachedProviders, ProvidersResponse } from '@/types/providers.ts'
import { CACHE_DIR } from '@/utils/config.ts'
import { cacheProviders, getCachedProviders, getProviders, isCacheStale } from '@/utils/models-api.ts'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const CACHE_FILE = join(CACHE_DIR, 'providers.json')

describe('models-api', () => {
  const backupFile = `${CACHE_FILE}.test-backup`

  beforeEach(() => {
    if (existsSync(CACHE_FILE)) {
      rmSync(backupFile, { force: true })
      renameSync(CACHE_FILE, backupFile)
    }
    rmSync(CACHE_FILE, { force: true })
  })

  afterEach(() => {
    rmSync(CACHE_FILE, { force: true })
    if (existsSync(backupFile)) {
      renameSync(backupFile, CACHE_FILE)
    }
  })

  test('isCacheStale returns true for old cache', () => {
    const oldCache: CachedProviders = {
      data: {},
      timestamp: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
    }
    expect(isCacheStale(oldCache)).toBe(true)
  })

  test('isCacheStale returns false for fresh cache', () => {
    const freshCache: CachedProviders = {
      data: {},
      timestamp: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
    }
    expect(isCacheStale(freshCache)).toBe(false)
  })

  test('getCachedProviders returns null for missing file', async () => {
    const result = await getCachedProviders()
    expect(result).toBeNull()
  })

  test('cacheProviders writes valid JSON', async () => {
    const testData: ProvidersResponse = {
      anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        models: {},
        env: [],
        npm: '',
        api: ''
      },
    }
    await cacheProviders(testData)

    const cached = await getCachedProviders()
    expect(cached).not.toBeNull()
    expect(cached?.data).toEqual(testData)
    expect(cached?.timestamp).toBeDefined()
  })

  test('getProviders returns data from network', async () => {
    // This test makes a real network call
    const providers = await getProviders()
    expect(Object.keys(providers).length).toBeGreaterThan(0)
  })
})
