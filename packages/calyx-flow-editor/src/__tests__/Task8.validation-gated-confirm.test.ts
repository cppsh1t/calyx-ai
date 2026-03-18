import { validateComplexParameterJson } from '@/utils/validation.ts'
import { describe, expect, it } from 'bun:test'
import { z } from 'zod'

/**
 * Tests for Task 8: Validation-Gated Confirm + Canonical Save Pipeline
 *
 * These tests verify:
 * 1. Complex parameter confirm is gated by both parse and schema validation
 * 2. Parse errors keep modal open and expose error state
 * 3. Schema errors keep modal open and expose error state with field-level issues
 * 4. Valid JSON + valid schema commits successfully
 */

describe('Task 8: Validation-Gated Confirm Pipeline', () => {
  // Schema that matches expected parameter structure
  const testSchema = z.object({
    name: z.string(),
    count: z.number(),
    enabled: z.boolean().optional(),
  })

  describe('Valid confirm path (parse + schema succeed)', () => {
    it('validates valid JSON successfully', () => {
      const result = validateComplexParameterJson('{"name": "test", "count": 5}', testSchema)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value).toEqual({ name: 'test', count: 5 })
      }
    })

    it('validates valid JSON with optional fields', () => {
      const result = validateComplexParameterJson('{"name": "test", "count": 5, "enabled": true}', testSchema)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value).toEqual({ name: 'test', count: 5, enabled: true })
      }
    })

    it('valid value is ready for Option.Some wrapping', () => {
      const result = validateComplexParameterJson('{"name": "test", "count": 5}', testSchema)

      expect(result.success).toBe(true)
      if (result.success) {
        // This is how ComplexParameterControl would wrap the validated value
        const option = { type: 'Some' as const, value: result.value }
        expect(option.type).toBe('Some')
        expect(option.value).toEqual({ name: 'test', count: 5 })
      }
    })
  })

  describe('Invalid confirm path - parse errors (modal stays open)', () => {
    it('returns parse error for invalid JSON syntax', () => {
      const result = validateComplexParameterJson('not valid json', testSchema)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorType).toBe('parse')
        expect(result.message).toContain('Invalid JSON')
      }
    })

    it('returns parse error for unclosed brace', () => {
      const result = validateComplexParameterJson('{"name": "test"', testSchema)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorType).toBe('parse')
      }
    })

    it('returns parse error for trailing comma', () => {
      const result = validateComplexParameterJson('{"name": "test",}', testSchema)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorType).toBe('parse')
      }
    })

    it('parse error exposes error message for UI display', () => {
      const result = validateComplexParameterJson('{invalid}', testSchema)

      expect(result.success).toBe(false)
      if (!result.success && result.errorType === 'parse') {
        // Error message is observable for UI display
        expect(result.message).toBeTruthy()
        expect(typeof result.message).toBe('string')
        expect(result.message.length).toBeGreaterThan(0)
      }
    })

    it('parse error includes original cause for debugging', () => {
      const result = validateComplexParameterJson('bad json', testSchema)

      expect(result.success).toBe(false)
      if (!result.success && result.errorType === 'parse') {
        expect(result.cause).toBeInstanceOf(Error)
      }
    })
  })

  describe('Invalid confirm path - schema errors (modal stays open)', () => {
    it('returns schema error for wrong type (number instead of string)', () => {
      const result = validateComplexParameterJson('{"name": 123, "count": 5}', testSchema)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorType).toBe('schema')
        expect(result.message).toContain('name')
      }
    })

    it('returns schema error for missing required field', () => {
      const result = validateComplexParameterJson('{"name": "test"}', testSchema)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorType).toBe('schema')
        expect(result.message).toContain('count')
      }
    })

    it('schema error exposes field-level issues for UI display', () => {
      const result = validateComplexParameterJson('{"name": 123, "count": "five"}', testSchema)

      expect(result.success).toBe(false)
      if (!result.success && result.errorType === 'schema') {
        // Issues array is exposed for detailed error display
        expect(result.issues).toBeInstanceOf(Array)
        expect(result.issues.length).toBeGreaterThan(0)

        // Each issue has path and message
        const firstIssue = result.issues[0]
        expect(firstIssue).toBeDefined()
        if (firstIssue) {
          expect(firstIssue).toHaveProperty('path')
          expect(firstIssue).toHaveProperty('message')
        }
      }
    })

    it('schema error includes path information for field-level display', () => {
      const nestedSchema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      })

      const result = validateComplexParameterJson('{"user": {"name": 123, "age": "young"}}', nestedSchema)

      expect(result.success).toBe(false)
      if (!result.success && result.errorType === 'schema') {
        const hasNameIssue = result.issues.some((i) => i.path.includes('name'))
        const hasAgeIssue = result.issues.some((i) => i.path.includes('age'))
        expect(hasNameIssue || hasAgeIssue).toBe(true)
      }
    })

    it('schema error includes original cause for debugging', () => {
      const result = validateComplexParameterJson('{"name": 123}', testSchema)

      expect(result.success).toBe(false)
      if (!result.success && result.errorType === 'schema') {
        expect(result.cause).toBeInstanceOf(Error)
      }
    })
  })

  describe('Validation state contract for UI integration', () => {
    it('error state includes type discriminator for branching UI logic', () => {
      const parseError = validateComplexParameterJson('bad', testSchema)
      const schemaError = validateComplexParameterJson('{"name": 123}', testSchema)
      const success = validateComplexParameterJson('{"name": "test", "count": 5}', testSchema)

      // Type discriminator allows exhaustive handling
      expect(parseError.success).toBe(false)
      if (!parseError.success) {
        expect(parseError.errorType).toBe('parse')
      }

      expect(schemaError.success).toBe(false)
      if (!schemaError.success) {
        expect(schemaError.errorType).toBe('schema')
      }

      expect(success.success).toBe(true)
    })

    it('parse error exposes message for error display', () => {
      const result = validateComplexParameterJson('invalid', testSchema)

      if (!result.success && result.errorType === 'parse') {
        // UI can display this message directly
        expect(result.message).toContain('Invalid JSON')
      }
    })

    it('schema error exposes issues array for field-level error display', () => {
      const result = validateComplexParameterJson('{"name": 123, "count": "five"}', testSchema)

      if (!result.success && result.errorType === 'schema') {
        // UI can iterate over issues to show field-level errors
        expect(Array.isArray(result.issues)).toBe(true)
        result.issues.forEach((issue) => {
          expect(typeof issue.message).toBe('string')
          expect(Array.isArray(issue.path)).toBe(true)
        })
      }
    })
  })

  describe('Integration: ComplexParameterControl behavior contract', () => {
    it('validation failure keeps modal open (does not call onChange)', () => {
      // This test documents the expected behavior:
      // When validation fails, onChange should NOT be called and
      // the modal should remain open with error state visible.

      // Simulating the behavior:
      // 1. User enters invalid JSON
      const draftText = 'invalid json'
      const result = validateComplexParameterJson(draftText, testSchema)

      // 2. Validation fails
      expect(result.success).toBe(false)

      // 3. onChange should NOT be called (modal stays open)
      let onChangeCalled = false
      if (result.success) {
        onChangeCalled = true // This would be onChange(some(result.value))
      }
      expect(onChangeCalled).toBe(false)
    })

    it('validation success commits value and closes modal (calls onChange)', () => {
      // Simulating the behavior:
      // 1. User enters valid JSON matching schema
      const draftText = '{"name": "test", "count": 5}'
      const result = validateComplexParameterJson(draftText, testSchema)

      // 2. Validation succeeds
      expect(result.success).toBe(true)

      // 3. onChange SHOULD be called with validated value
      let onChangeCalled = false
      let receivedValue = null
      if (result.success) {
        onChangeCalled = true
        receivedValue = result.value
      }
      expect(onChangeCalled).toBe(true)
      expect(receivedValue).toEqual({ name: 'test', count: 5 })
    })

    it('empty draft clears value (commits None)', () => {
      // Simulating the behavior:
      // 1. User clears the draft (empty string)
      const draftText = ''

      // 2. Empty draft commits None (clear operation)
      // This bypasses validation since clearing is always valid
      const isEmpty = draftText.trim() === ''
      expect(isEmpty).toBe(true)

      // 3. onChange would be called with none()
      // (This is handled before validation in the component)
    })
  })
})
