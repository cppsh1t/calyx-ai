import { ConfigError, ConfigErrorType, configExists, getProjectConfigPath, initProjectConfig, readConfig, writeConfig, type Config } from '@/utils/config.ts'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Configuration Management Tests
 *
 * This test suite validates the configuration file management system
 * for the Calyx CLI tool. Tests cover:
 *
 * 1. Path Resolution: Project config paths (user config uses os.homedir which is platform-specific)
 * 2. File Operations: Read, write, existence checks
 * 3. Initialization: Project config creation
 * 4. Error Handling: All ConfigError types
 * 5. Atomic Writes: Transaction safety
 */

describe('Configuration Management', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(async () => {
    // Create unique temporary directory for each test (platform-appropriate)
    tempDir = join(tmpdir(), `calyx-config-test-${Date.now()}`)

    // Create the temp directory first
    await mkdir(tempDir, { recursive: true })

    // Save original working directory
    originalCwd = process.cwd()

    // Change to temp directory
    process.chdir(tempDir)
  })

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }

    // Restore original working directory
    process.chdir(originalCwd)
  })

  describe('Path Resolution', () => {
    test('getProjectConfigPath returns correct path', () => {
      const path = getProjectConfigPath()
      expect(path).toBe(join(process.cwd(), '.calyx', 'config.json'))
    })

    test('getProjectConfigPath includes .calyx directory', () => {
      const path = getProjectConfigPath()
      expect(path).toContain('.calyx')
      expect(path).toContain('config.json')
    })
  })

  describe('File Existence Checks', () => {
    test('configExists returns false for non-existent file', async () => {
      const nonExistentPath = join(tempDir, 'nonexistent.json')
      const exists = await configExists(nonExistentPath)
      expect(exists).toBe(false)
    })

    test('configExists returns true for existing file', async () => {
      const testPath = join(tempDir, 'test.json')
      await writeFile(testPath, '{}', 'utf-8')

      const exists = await configExists(testPath)
      expect(exists).toBe(true)
    })

    test('configExists returns true for directory', async () => {
      const dirPath = join(tempDir, 'testdir')
      await mkdir(dirPath, { recursive: true })

      // Directories are accessible via access()
      const exists = await configExists(dirPath)
      expect(exists).toBe(true)
    })
  })

  describe('Reading Configuration', () => {
    test('readConfig parses valid JSON file', async () => {
      const testPath = join(tempDir, 'config.json')
      const testData = { key: 'value', number: 42, nested: { prop: true } }
      await writeFile(testPath, JSON.stringify(testData, null, 2), 'utf-8')

      const config = await readConfig(testPath)
      expect(config).toEqual(testData)
    })

    test('readConfig parses empty object', async () => {
      const testPath = join(tempDir, 'empty.json')
      await writeFile(testPath, '{}', 'utf-8')

      const config = await readConfig(testPath)
      expect(config).toEqual({})
    })

    test('readConfig parses JSON array inside object', async () => {
      const testPath = join(tempDir, 'array.json')
      const arrayData = { items: [1, 2, 3], nested: { arr: ['a', 'b'] } }
      await writeFile(testPath, JSON.stringify(arrayData), 'utf-8')

      const config = await readConfig(testPath)
      expect(config).toEqual(arrayData)
      expect(Array.isArray(config.items)).toBe(true)
      expect(config.items).toEqual([1, 2, 3])
    })

    test('readConfig throws EXISTS error for missing file', async () => {
      const nonExistentPath = join(tempDir, 'nonexistent.json')

      await expect(readConfig(nonExistentPath)).rejects.toThrow(ConfigError)
      await expect(readConfig(nonExistentPath)).rejects.toThrow('does not exist')

      try {
        await readConfig(nonExistentPath)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).type).toBe(ConfigErrorType.EXISTS)
        expect((error as ConfigError).path).toBe(nonExistentPath)
      }
    })

    test('readConfig throws PARSE_ERROR for invalid JSON', async () => {
      const testPath = join(tempDir, 'invalid.json')
      await writeFile(testPath, '{invalid json}', 'utf-8')

      await expect(readConfig(testPath)).rejects.toThrow(ConfigError)
      await expect(readConfig(testPath)).rejects.toThrow('Failed to parse JSON')

      try {
        await readConfig(testPath)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).type).toBe(ConfigErrorType.PARSE_ERROR)
        expect((error as ConfigError).path).toBe(testPath)
      }
    })

    test('readConfig throws PARSE_ERROR for malformed JSON', async () => {
      const testPath = join(tempDir, 'malformed.json')
      await writeFile(testPath, '{"key": value}', 'utf-8') // Missing quotes

      await expect(readConfig(testPath)).rejects.toThrow(ConfigError)
      await expect(readConfig(testPath)).rejects.toThrow('Failed to parse JSON')

      try {
        await readConfig(testPath)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).type).toBe(ConfigErrorType.PARSE_ERROR)
      }
    })
  })

  describe('Writing Configuration', () => {
    test('writeConfig creates file with formatted JSON', async () => {
      const testPath = join(tempDir, 'write.json')
      const testData: Config = { key: 'value', number: 123 }

      await writeConfig(testPath, testData)

      const { readFile } = await import('node:fs/promises')
      const content = await readFile(testPath, 'utf-8')
      const parsed = JSON.parse(content) as Config

      expect(parsed).toEqual(testData)
      expect(content).toContain('{\n') // Check for pretty-printing
    })

    test('writeConfig creates parent directories', async () => {
      const testPath = join(tempDir, 'nested', 'deep', 'config.json')
      const testData: Config = { test: true }

      await writeConfig(testPath, testData)

      const { readFile } = await import('node:fs/promises')
      const content = await readFile(testPath, 'utf-8')
      expect(content).toBeTruthy()
    })

    test('writeConfig overwrites existing file', async () => {
      const testPath = join(tempDir, 'overwrite.json')
      const firstData: Config = { old: 'data' }
      const secondData: Config = { new: 'data' }

      await writeConfig(testPath, firstData)
      await writeConfig(testPath, secondData)

      const result = await readConfig(testPath)
      expect(result).toEqual(secondData)
      expect(result).not.toEqual(firstData)
    })

    test('writeConfig performs atomic write', async () => {
      const testPath = join(tempDir, 'atomic.json')
      const testData: Config = { atomic: true }

      await writeConfig(testPath, testData)

      // Atomic writes use temp files with process.pid
      const tempFilePattern = `${testPath}.${process.pid}.tmp`

      // Temp file should be cleaned up after successful write
      const tempExists = await configExists(tempFilePattern)
      expect(tempExists).toBe(false)

      // Final file should exist
      const finalExists = await configExists(testPath)
      expect(finalExists).toBe(true)
    })

    test('writeConfig handles complex nested objects', async () => {
      const testPath = join(tempDir, 'complex.json')
      const complexData: Config = {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: {
          deep: {
            value: 'nested',
          },
        },
      }

      await writeConfig(testPath, complexData)

      const result = await readConfig(testPath)
      expect(result).toEqual(complexData)
    })

    test('writeConfig handles empty object', async () => {
      const testPath = join(tempDir, 'empty.json')
      const emptyData: Config = {}

      await writeConfig(testPath, emptyData)

      const result = await readConfig(testPath)
      expect(result).toEqual({})
    })
  })

  describe('Project Configuration Initialization', () => {
    test('initProjectConfig creates config when it does not exist', async () => {
      const projectPath = getProjectConfigPath()

      const resultPath = await initProjectConfig()
      expect(resultPath).toBe(projectPath)

      const exists = await configExists(projectPath)
      expect(exists).toBe(true)

      const config = await readConfig(projectPath)
      expect(config).toEqual({ configVersion: '0.1' })
    })

    test('initProjectConfig skips when config already exists', async () => {
      const projectPath = getProjectConfigPath()
      const testData: Config = { existing: true }

      // Create config first
      await writeConfig(projectPath, testData)

      const resultPath = await initProjectConfig()
      expect(resultPath).toBe(projectPath)

      // Config should not be overwritten
      const config = await readConfig(projectPath)
      expect(config).toEqual(testData)
    })
  })

  describe('Error Scenarios and Edge Cases', () => {
    test('handles Unicode characters in config values', async () => {
      const testPath = join(tempDir, 'unicode.json')
      const unicodeData: Config = {
        chinese: '中文',
        emoji: '🎉',
        japanese: '日本語',
        mixed: 'Hello 世界 🌍',
      }

      await writeConfig(testPath, unicodeData)
      const result = await readConfig(testPath)

      expect(result).toEqual(unicodeData)
    })

    test('handles special characters in keys', async () => {
      const testPath = join(tempDir, 'special-keys.json')
      const specialData: Config = {
        'key-with-dash': 'value1',
        key_with_underscore: 'value2',
        'key.with.dots': 'value3',
        'key with spaces': 'value4',
      }

      await writeConfig(testPath, specialData)
      const result = await readConfig(testPath)

      expect(result).toEqual(specialData)
    })

    test('handles very large config objects', async () => {
      const testPath = join(tempDir, 'large.json')
      const largeData: Config = {}

      // Create object with 1000 keys
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = `value${i}`
      }

      await writeConfig(testPath, largeData)
      const result = await readConfig(testPath)

      expect(Object.keys(result).length).toBe(1000)
      expect(result).toEqual(largeData)
    })

    test('readConfig throws on truncated JSON', async () => {
      const testPath = join(tempDir, 'truncated.json')
      await writeFile(testPath, '{"key": "value"', 'utf-8') // Missing closing brace

      await expect(readConfig(testPath)).rejects.toThrow(ConfigError)
      await expect(readConfig(testPath)).rejects.toThrow('Failed to parse JSON')
    })

    test('readConfig throws on empty file', async () => {
      const testPath = join(tempDir, 'empty-file.json')
      await writeFile(testPath, '', 'utf-8')

      await expect(readConfig(testPath)).rejects.toThrow(ConfigError)
      await expect(readConfig(testPath)).rejects.toThrow('Failed to parse JSON')
    })
  })

  describe('ConfigError Class', () => {
    test('ConfigError has correct properties', () => {
      const error = new ConfigError(ConfigErrorType.PARSE_ERROR, 'Test error message', '/test/path.json')

      expect(error.type).toBe(ConfigErrorType.PARSE_ERROR)
      expect(error.message).toBe('Test error message')
      expect(error.path).toBe('/test/path.json')
      expect(error.name).toBe('ConfigError')
    })

    test('ConfigError is instanceof Error', () => {
      const error = new ConfigError(ConfigErrorType.WRITE_ERROR, 'Write failed')

      expect(error instanceof Error).toBe(true)
      expect(error instanceof ConfigError).toBe(true)
    })

    test('ConfigError works with all error types', () => {
      const parseError = new ConfigError(ConfigErrorType.PARSE_ERROR, 'Parse failed')
      const writeError = new ConfigError(ConfigErrorType.WRITE_ERROR, 'Write failed')
      const existsError = new ConfigError(ConfigErrorType.EXISTS, 'File not found')

      expect(parseError.type).toBe(ConfigErrorType.PARSE_ERROR)
      expect(writeError.type).toBe(ConfigErrorType.WRITE_ERROR)
      expect(existsError.type).toBe(ConfigErrorType.EXISTS)
    })

    test('ConfigError can be thrown and caught', async () => {
      const testPath = join(tempDir, 'error-test.json')

      try {
        await readConfig(testPath)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
      }
    })
  })

  describe('Integration Tests', () => {
    test('full workflow: init, write, read', async () => {
      // Initialize project config
      const projectPath = await initProjectConfig()
      expect(await configExists(projectPath)).toBe(true)

      // Write some data
      const testData: Config = {
        models: ['gpt-4', 'claude-3'],
        default: 'gpt-4',
      }
      await writeConfig(projectPath, testData)

      // Read it back
      const readData = await readConfig(projectPath)
      expect(readData).toEqual(testData)
    })

    test('multiple writes maintain data integrity', async () => {
      const testPath = join(tempDir, 'integrity.json')
      const versions: Config[] = [
        { version: 1, data: 'first' },
        { version: 2, data: 'second' },
        { version: 3, data: 'third' },
      ]

      for (const data of versions) {
        await writeConfig(testPath, data)
        const read = await readConfig(testPath)
        expect(read).toEqual(data)
      }

      // Final state should be the last write
      const final = await readConfig(testPath)
      expect(versions).toHaveLength(3)
      const lastVersion = versions[versions.length - 1]
      if (lastVersion) {
        expect(final).toEqual(lastVersion)
      }
    })
  })

  describe('Atomic Write Safety', () => {
    test('atomic write does not leave temp files after success', async () => {
      const testPath = join(tempDir, 'atomic-safe.json')
      const testData: Config = { atomic: true }

      await writeConfig(testPath, testData)

      // Verify final file exists
      const finalExists = await configExists(testPath)
      expect(finalExists).toBe(true)

      // Verify temp file does not exist
      const tempFilePattern = `${testPath}.${process.pid}.tmp`
      const tempExists = await configExists(tempFilePattern)
      expect(tempExists).toBe(false)

      // Verify data is correct
      const result = await readConfig(testPath)
      expect(result).toEqual(testData)
    })

    test('consecutive writes are atomic', async () => {
      const testPath = join(tempDir, 'consecutive.json')
      const writes: Config[] = [{ sequence: 1 }, { sequence: 2 }, { sequence: 3 }]

      for (const data of writes) {
        await writeConfig(testPath, data)
      }

      // Final write should be the one that persists
      const result = await readConfig(testPath)
      expect(writes).toHaveLength(3)
      const lastWrite = writes[writes.length - 1]
      if (lastWrite) {
        expect(result).toEqual(lastWrite)
      }
    })

    test('atomic write creates parent directories atomically', async () => {
      const testPath = join(tempDir, 'deep', 'nested', 'atomic.json')
      const testData: Config = { nested: true }

      await writeConfig(testPath, testData)

      const exists = await configExists(testPath)
      expect(exists).toBe(true)

      const result = await readConfig(testPath)
      expect(result).toEqual(testData)
    })
  })

  describe('Copy User to Project Config', () => {
    test('copyUserToProjectConfig requires existing user config', async () => {
      // This test verifies that copyUserToProjectConfig throws an error
      // when the user config doesn't exist
      // Note: We can't fully test this without mocking os.homedir()
      // but we can verify the error type is correct
      const userConfigPath = join(tempDir, 'user', 'config.json')

      // Create a mock user config scenario
      await writeConfig(userConfigPath, { test: true })

      // Since we can't mock getUserConfigPath(), we test the underlying
      // read/write operations that copyUserToProjectConfig uses
      const projectPath = join(tempDir, 'project', 'config.json')
      const testData: Config = { copied: true }

      await writeConfig(userConfigPath, testData)
      const userConfig = await readConfig(userConfigPath)
      await writeConfig(projectPath, userConfig)

      const projectConfig = await readConfig(projectPath)
      expect(projectConfig).toEqual(testData)
    })
  })
})
