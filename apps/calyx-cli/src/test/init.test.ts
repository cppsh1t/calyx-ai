import { testParse } from '@/utils/cli.ts'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Init Command Integration Tests
 *
 * This test suite validates the `calyx init` command functionality.
 * Tests cover:
 *
 * 1. Empty Config Creation: `calyx init` creates .calyx/config.json with configVersion
 * 2. User Config Copy: `calyx init --copy` copies user config
 * 3. Shorthand Options: `calyx init -c` works
 * 4. Error Handling: Config exists → exit code 1, error message
 */

describe('Init Command Integration Tests', () => {
  let originalCwd: string
  let tempDir: string

  beforeEach(() => {
    // Store original working directory
    originalCwd = process.cwd()

    // Create unique temporary directory for each test
    tempDir = join(tmpdir(), `calyx-init-test-${Date.now()}-${Math.random()}`)
    mkdirSync(tempDir, { recursive: true })

    // Change to temporary directory
    process.chdir(tempDir)
  })

  afterEach(() => {
    // Cleanup: restore working directory and remove temp directory
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('Empty Config Creation', () => {
    test('creates .calyx/config.json with configVersion', async () => {
      // Execute: calyx init
      await testParse(['bun', 'cli', 'init'])

      // Verify: config file exists
      const configPath = join(tempDir, '.calyx', 'config.json')
      expect(existsSync(configPath)).toBe(true)

      // Verify: content is default config with configVersion
      const content = readFileSync(configPath, 'utf-8')
      const config = JSON.parse(content)
      expect(config).toEqual({
        configVersion: '0.1',
      })
    })

    test('creates .calyx directory structure', async () => {
      // Execute: calyx init
      await testParse(['bun', 'cli', 'init'])

      // Verify: .calyx directory exists
      const calyxDir = join(tempDir, '.calyx')
      expect(existsSync(calyxDir)).toBe(true)

      // Verify: config.json file exists
      const configPath = join(calyxDir, 'config.json')
      expect(existsSync(configPath)).toBe(true)
    })
  })

  describe('User Config Copy', () => {
    test('copies user config with --copy option', async () => {
      // This test assumes user config exists at ~/.calyx/config.json
      // If it doesn't exist, the test will fail with process.exit(1)

      // Execute: calyx init --copy
      await testParse(['bun', 'cli', 'init', '--copy'])

      // Verify: config file exists
      const configPath = join(tempDir, '.calyx', 'config.json')
      expect(existsSync(configPath)).toBe(true)

      // Verify: content is valid JSON (not empty object since it was copied)
      const content = readFileSync(configPath, 'utf-8')
      expect(() => JSON.parse(content)).not.toThrow()
    })

    test('accepts -c as shorthand for --copy', async () => {
      // Execute: calyx init -c
      await testParse(['bun', 'cli', 'init', '-c'])

      // Verify: config file exists
      const configPath = join(tempDir, '.calyx', 'config.json')
      expect(existsSync(configPath)).toBe(true)

      // Verify: content is valid JSON
      const content = readFileSync(configPath, 'utf-8')
      expect(() => JSON.parse(content)).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    test('exits with code 1 when config already exists', async () => {
      // Setup: Create existing config
      const configDir = join(tempDir, '.calyx')
      mkdirSync(configDir, { recursive: true })
      const configPath = join(configDir, 'config.json')
      await writeFile(configPath, '{"existing": true}', 'utf-8')

      // Track if process.exit was called
      let exitCalled = false
      let exitCode = 0

      // Mock process.exit to prevent actual process termination
      const originalExit = process.exit
      process.exit = ((code: number = 0) => {
        exitCalled = true
        exitCode = code
        // Don't actually exit in tests
      }) as never

      // Capture console.error
      const errorLogs: string[] = []
      const originalError = console.error
      console.error = ((...args: unknown[]) => {
        errorLogs.push(args.map(String).join(' '))
      }) as never

      try {
        // Execute: calyx init (should fail)
        await testParse(['bun', 'cli', 'init'])
      } catch (_error) {
        // Command errors are caught internally
      } finally {
        console.error = originalError
        process.exit = originalExit
      }

      // Verify: process.exit(1) was called
      expect(exitCalled).toBe(true)
      expect(exitCode).toBe(1)

      // Verify: error message contains "already exists"
      const errorOutput = errorLogs.join(' ')
      expect(errorOutput).toContain('already exists')
    })

    test('displays error message when config exists', async () => {
      // Setup: Create existing config
      const configDir = join(tempDir, '.calyx')
      mkdirSync(configDir, { recursive: true })
      const configPath = join(configDir, 'config.json')
      await writeFile(configPath, '{"existing": true}', 'utf-8')

      // Track if process.exit was called
      let exitCalled = false
      let exitCode = 0

      // Mock process.exit to prevent actual process termination
      const originalExit = process.exit
      process.exit = ((code: number = 0) => {
        exitCalled = true
        exitCode = code
        // Don't actually exit in tests
      }) as never

      // Capture console.error
      const errorLogs: string[] = []
      const originalError = console.error
      console.error = ((...args: unknown[]) => {
        errorLogs.push(args.map(String).join(' '))
      }) as never

      try {
        // Execute: calyx init (should fail)
        await testParse(['bun', 'cli', 'init'])
      } catch (_error) {
        // Command errors are caught internally
      } finally {
        console.error = originalError
        process.exit = originalExit
      }

      // Verify: error message contains "already exists"
      const errorOutput = errorLogs.join(' ')
      expect(errorOutput).toContain('already exists')

      // Verify: error message contains "calyx config"
      expect(errorOutput).toContain('calyx config')

      // Verify: process.exit(1) was called
      expect(exitCalled).toBe(true)
      expect(exitCode).toBe(1)
    })

    test('does not overwrite existing config', async () => {
      // Setup: Create existing config with specific content
      const configDir = join(tempDir, '.calyx')
      mkdirSync(configDir, { recursive: true })
      const configPath = join(configDir, 'config.json')
      const originalContent = '{"original": "data", "value": 123}'
      await writeFile(configPath, originalContent, 'utf-8')

      // Mock process.exit to prevent actual process termination
      const originalExit = process.exit
      process.exit = ((_code: number = 0) => {
        // Don't actually exit in tests
      }) as never

      try {
        // Execute: calyx init (should fail without overwriting)
        await testParse(['bun', 'cli', 'init'])
      } catch (_error) {
        // Command errors are caught internally
      } finally {
        process.exit = originalExit
      }

      // Verify: original config content is unchanged
      const currentContent = readFileSync(configPath, 'utf-8')
      expect(currentContent).toBe(originalContent)
    })
  })

  describe('Shorthand Option', () => {
    test('treats -c and --copy identically', async () => {
      // Both should create the same config file when user config exists
      const testCases = [
        { args: ['bun', 'cli', 'init', '-c'], name: '-c' },
        { args: ['bun', 'cli', 'init', '--copy'], name: '--copy' },
      ]

      for (const testCase of testCases) {
        // Create new temp dir for each test case
        const testDir = join(tempDir, testCase.name)
        mkdirSync(testDir, { recursive: true })
        process.chdir(testDir)

        // Execute the command
        await testParse(testCase.args)

        // Verify: config file exists
        const configPath = join(testDir, '.calyx', 'config.json')
        expect(existsSync(configPath)).toBe(true)

        // Verify: content is valid JSON
        const content = readFileSync(configPath, 'utf-8')
        expect(() => JSON.parse(content)).not.toThrow()

        // Cleanup
        process.chdir(tempDir)
      }
    })
  })
})
