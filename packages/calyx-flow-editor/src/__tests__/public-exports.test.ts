import type {
  AdapterResult,
  FlowEditorProps,
  HandleDirection,
  ParsedHandleId,
  ValidationParseError,
  ValidationResult,
  ValidationSchemaError,
  ValidationSuccess,
} from '@/index.ts'
import { FlowEditor } from '@/index.ts'
import { describe, expect, it } from 'bun:test'
import type { Flow } from 'calyx-flow/types'

/**
 * Public API Export Regression Tests
 *
 * These tests verify that the public API surface remains stable.
 * If any exported type or function is removed, these tests will fail.
 */
describe('public exports', () => {
  describe('FlowEditor component', () => {
    it('exports FlowEditor component', () => {
      expect(FlowEditor).toBeDefined()
      expect(typeof FlowEditor).toBe('function')
    })

    it('exports FlowEditorProps type', () => {
      // Type-only test - verifies the type can be imported and used
      const props: FlowEditorProps = {
        flow: { name: 'test' } as Flow,
        onSave: (_flow: Flow) => {},
      }
      expect(props).toBeDefined()
      expect(props.flow).toBeDefined()
      expect(props.onSave).toBeDefined()
    })
  })

  describe('adapter types', () => {
    it('exports HandleDirection type', () => {
      const direction: HandleDirection = 'in'
      expect(direction).toBe('in')

      const outDirection: HandleDirection = 'out'
      expect(outDirection).toBe('out')
    })

    it('exports ParsedHandleId type', () => {
      const successHandle: ParsedHandleId = {
        type: 'success',
        direction: 'in',
        portId: 'test-port',
      }
      expect(successHandle.type).toBe('success')
      expect(successHandle.direction).toBe('in')
      expect(successHandle.portId).toBe('test-port')

      const errorHandle: ParsedHandleId = {
        type: 'error',
        reason: 'invalid_format',
        raw: 'bad-handle',
      }
      expect(errorHandle.type).toBe('error')
      expect(errorHandle.reason).toBe('invalid_format')
    })

    it('exports AdapterResult type', () => {
      const successResult: AdapterResult<string> = {
        type: 'success',
        data: 'test-data',
      }
      expect(successResult.type).toBe('success')
      expect(successResult.data).toBe('test-data')

      const errorResult: AdapterResult<string> = {
        type: 'error',
        message: 'test-error',
      }
      expect(errorResult.type).toBe('error')
      expect(errorResult.message).toBe('test-error')
    })
  })

  describe('validation types', () => {
    it('exports ValidationResult type', () => {
      const successResult: ValidationResult<object> = {
        success: true,
        value: { test: true },
      }
      expect(successResult.success).toBe(true)

      const parseError: ValidationResult<object> = {
        success: false,
        errorType: 'parse',
        message: 'Invalid JSON',
        cause: new Error('parse error'),
      }
      expect(parseError.success).toBe(false)
      expect(parseError.errorType).toBe('parse')
    })

    it('exports ValidationSuccess type', () => {
      const result: ValidationSuccess<string> = {
        success: true,
        value: 'test-value',
      }
      expect(result.success).toBe(true)
      expect(result.value).toBe('test-value')
    })

    it('exports ValidationParseError type', () => {
      const error: ValidationParseError = {
        success: false,
        errorType: 'parse',
        message: 'Invalid JSON syntax',
        cause: new Error('Unexpected token'),
      }
      expect(error.success).toBe(false)
      expect(error.errorType).toBe('parse')
      expect(error.message).toBe('Invalid JSON syntax')
    })

    it('exports ValidationSchemaError type', () => {
      const error: ValidationSchemaError = {
        success: false,
        errorType: 'schema',
        message: 'Validation failed',
        issues: [
          { path: ['field1'], message: 'Required' },
          { path: ['field2', 'nested'], message: 'Invalid type' },
        ],
        cause: new Error('schema validation failed'),
      }
      expect(error.success).toBe(false)
      expect(error.errorType).toBe('schema')
      expect(error.issues).toHaveLength(2)
    })
  })
})
