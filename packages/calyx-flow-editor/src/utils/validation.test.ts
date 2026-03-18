import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { isValidationParseError, isValidationSchemaError, isValidationSuccess, validateComplexParameterJson } from './validation.ts'

describe('utility: Validation', () => {
  // Test schema for validation
  const testSchema = z.object({
    name: z.string(),
    count: z.number(),
    enabled: z.boolean().optional(),
  })

  describe('Branch 1: Parse error (malformed JSON)', () => {
    test('returns parse error for empty string', () => {
      const result = validateComplexParameterJson('', testSchema)

      expect(result.success).toBe(false)
      expect(isValidationParseError(result)).toBe(true)

      if (isValidationParseError(result)) {
        expect(result.errorType).toBe('parse')
        expect(result.message).toContain('Invalid JSON')
        expect(result.cause).toBeInstanceOf(Error)
      }
    })

    test('returns parse error for invalid JSON syntax', () => {
      const result = validateComplexParameterJson('not valid json', testSchema)

      expect(result.success).toBe(false)
      expect(isValidationParseError(result)).toBe(true)

      if (isValidationParseError(result)) {
        expect(result.errorType).toBe('parse')
        expect(result.message).toContain('Invalid JSON')
        expect(result.cause).toBeInstanceOf(Error)
      }
    })

    test('returns parse error for unclosed brace', () => {
      const result = validateComplexParameterJson('{"name": "test"', testSchema)

      expect(result.success).toBe(false)
      expect(isValidationParseError(result)).toBe(true)
    })

    test('returns parse error for trailing comma', () => {
      const result = validateComplexParameterJson('{"name": "test",}', testSchema)

      expect(result.success).toBe(false)
      expect(isValidationParseError(result)).toBe(true)
    })

    test('returns parse error for unquoted keys', () => {
      const result = validateComplexParameterJson('{name: "test"}', testSchema)

      expect(result.success).toBe(false)
      expect(isValidationParseError(result)).toBe(true)
    })

    test('isValidationParseError type guard returns true for parse errors', () => {
      const result = validateComplexParameterJson('invalid', testSchema)

      expect(isValidationParseError(result)).toBe(true)
      expect(isValidationSchemaError(result)).toBe(false)
      expect(isValidationSuccess(result)).toBe(false)
    })
  })

  describe('Branch 2: Schema error (valid JSON, invalid schema)', () => {
    test('returns schema error for wrong type (number instead of string)', () => {
      const result = validateComplexParameterJson('{"name": 123, "count": 5}', testSchema)

      expect(result.success).toBe(false)
      expect(isValidationSchemaError(result)).toBe(true)

      if (isValidationSchemaError(result)) {
        expect(result.errorType).toBe('schema')
        expect(result.message).toContain('Validation failed')
        expect(result.issues.length).toBeGreaterThan(0)
        expect(result.issues[0]).toHaveProperty('path')
        expect(result.issues[0]).toHaveProperty('message')
        expect(result.cause).toBeInstanceOf(Error)
      }
    })

    test('returns schema error for missing required field', () => {
      const result = validateComplexParameterJson('{"name": "test"}', testSchema)

      expect(result.success).toBe(false)
      expect(isValidationSchemaError(result)).toBe(true)

      if (isValidationSchemaError(result)) {
        expect(result.message).toContain('count')
      }
    })

    test('returns schema error for extra fields when strict', () => {
      const strictSchema = z
        .object({
          name: z.string(),
        })
        .strict()

      const result = validateComplexParameterJson('{"name": "test", "extra": "field"}', strictSchema)

      expect(result.success).toBe(false)
      expect(isValidationSchemaError(result)).toBe(true)
    })

    test('includes field path in schema error issues', () => {
      const nestedSchema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      })

      const result = validateComplexParameterJson('{"user": {"name": 123, "age": "young"}}', nestedSchema)

      expect(result.success).toBe(false)
      expect(isValidationSchemaError(result)).toBe(true)

      if (isValidationSchemaError(result)) {
        // Should have issues for both user.name and user.age
        const hasNameIssue = result.issues.some((i) => i.path.includes('name'))
        const hasAgeIssue = result.issues.some((i) => i.path.includes('age'))
        expect(hasNameIssue || hasAgeIssue).toBe(true)
      }
    })

    test('isValidationSchemaError type guard returns true for schema errors', () => {
      const result = validateComplexParameterJson('{"name": 123}', testSchema)

      expect(isValidationSchemaError(result)).toBe(true)
      expect(isValidationParseError(result)).toBe(false)
      expect(isValidationSuccess(result)).toBe(false)
    })
  })

  describe('Branch 3: Success (valid JSON + valid schema)', () => {
    test('returns success for valid object', () => {
      const json = '{"name": "test", "count": 5}'
      const result = validateComplexParameterJson(json, testSchema)

      expect(result.success).toBe(true)
      expect(isValidationSuccess(result)).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value).toEqual({ name: 'test', count: 5 })
      }
    })

    test('returns success with optional fields', () => {
      const json = '{"name": "test", "count": 5, "enabled": true}'
      const result = validateComplexParameterJson(json, testSchema)

      expect(result.success).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value).toEqual({ name: 'test', count: 5, enabled: true })
      }
    })

    test('returns success for array schema', () => {
      const arraySchema = z.array(z.string())
      const json = '["a", "b", "c"]'
      const result = validateComplexParameterJson(json, arraySchema)

      expect(result.success).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value).toEqual(['a', 'b', 'c'])
      }
    })

    test('returns success for primitive string schema', () => {
      const stringSchema = z.string()
      const result = validateComplexParameterJson('"hello"', stringSchema)

      expect(result.success).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value).toBe('hello')
      }
    })

    test('returns success for primitive number schema', () => {
      const numberSchema = z.number()
      const result = validateComplexParameterJson('42', numberSchema)

      expect(result.success).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value).toBe(42)
      }
    })

    test('returns success for boolean schema', () => {
      const booleanSchema = z.boolean()
      const result = validateComplexParameterJson('true', booleanSchema)

      expect(result.success).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value).toBe(true)
      }
    })

    test('returns success for null value with nullable schema', () => {
      const nullableSchema = z.string().nullable()
      const result = validateComplexParameterJson('null', nullableSchema)

      expect(result.success).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value).toBeNull()
      }
    })

    test('isValidationSuccess type guard returns true for success', () => {
      const result = validateComplexParameterJson('{"name": "test", "count": 5}', testSchema)

      expect(isValidationSuccess(result)).toBe(true)
      expect(isValidationParseError(result)).toBe(false)
      expect(isValidationSchemaError(result)).toBe(false)
    })
  })

  describe('Integration: Ready for Option.Some', () => {
    test('success value can be wrapped in Option.Some', () => {
      const result = validateComplexParameterJson('{"name": "test", "count": 5}', testSchema)

      if (isValidationSuccess(result)) {
        // This is how the UI would use it - wrap in Option.Some
        const option = { type: 'Some' as const, value: result.value }
        expect(option.type).toBe('Some')
        expect(option.value).toEqual({ name: 'test', count: 5 })
      } else {
        // Should not reach here
        throw new Error('Expected success result')
      }
    })

    test('error results should not be wrapped in Option.Some', () => {
      const parseError = validateComplexParameterJson('invalid', testSchema)
      const schemaError = validateComplexParameterJson('{"name": 123}', testSchema)

      expect(isValidationSuccess(parseError)).toBe(false)
      expect(isValidationSuccess(schemaError)).toBe(false)
    })
  })

  describe('Edge cases and complex schemas', () => {
    test('handles deeply nested objects', () => {
      const deepSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              value: z.string(),
            }),
          }),
        }),
      })

      const json = '{"level1": {"level2": {"level3": {"value": "deep"}}}}'
      const result = validateComplexParameterJson(json, deepSchema)

      expect(result.success).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value.level1.level2.level3.value).toBe('deep')
      }
    })

    test('handles union types', () => {
      const unionSchema = z.union([z.string(), z.number()])

      const stringResult = validateComplexParameterJson('"hello"', unionSchema)
      expect(stringResult.success).toBe(true)

      const numberResult = validateComplexParameterJson('42', unionSchema)
      expect(numberResult.success).toBe(true)

      const booleanResult = validateComplexParameterJson('true', unionSchema)
      expect(booleanResult.success).toBe(false)
      expect(isValidationSchemaError(booleanResult)).toBe(true)
    })

    test('handles discriminated unions', () => {
      const discriminatedSchema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('a'), aValue: z.string() }),
        z.object({ type: z.literal('b'), bValue: z.number() }),
      ])

      const aResult = validateComplexParameterJson('{"type": "a", "aValue": "test"}', discriminatedSchema)
      expect(aResult.success).toBe(true)

      const bResult = validateComplexParameterJson('{"type": "b", "bValue": 42}', discriminatedSchema)
      expect(bResult.success).toBe(true)

      const invalidResult = validateComplexParameterJson('{"type": "c"}', discriminatedSchema)
      expect(invalidResult.success).toBe(false)
    })

    test('handles empty arrays', () => {
      const arraySchema = z.array(z.string())
      const result = validateComplexParameterJson('[]', arraySchema)

      expect(result.success).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value).toEqual([])
      }
    })

    test('handles empty objects', () => {
      const emptySchema = z.object({})
      const result = validateComplexParameterJson('{}', emptySchema)

      expect(result.success).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value).toEqual({})
      }
    })

    test('handles whitespace in JSON', () => {
      const json = `{
        "name": "test",
        "count": 5
      }`
      const result = validateComplexParameterJson(json, testSchema)

      expect(result.success).toBe(true)
    })

    test('handles special characters in strings', () => {
      const json = '{"name": "test\\nwith\\nnewlines\\tand\\ttabs", "count": 1}'
      const result = validateComplexParameterJson(json, testSchema)

      expect(result.success).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value.name).toBe('test\nwith\nnewlines\tand\ttabs')
      }
    })

    test('handles unicode characters', () => {
      const json = '{"name": "\\u65e5\\u672c\\u8a9e\\u30c6\\u30ad\\u30b9\\u30c8", "count": 1}'
      const result = validateComplexParameterJson(json, testSchema)

      expect(result.success).toBe(true)

      if (isValidationSuccess(result)) {
        expect(result.value.name).toBe('\u65e5\u672c\u8a9e\u30c6\u30ad\u30b9\u30c8')
      }
    })
  })

  describe('Error message quality', () => {
    test('parse error message includes details', () => {
      const result = validateComplexParameterJson('{invalid}', testSchema)

      expect(isValidationParseError(result)).toBe(true)

      if (isValidationParseError(result)) {
        expect(result.message).toContain('Invalid JSON')
        // Should have some error detail
        expect(result.message.length).toBeGreaterThan('Invalid JSON'.length)
      }
    })

    test('schema error message includes field names', () => {
      const result = validateComplexParameterJson('{"name": 123, "count": "five"}', testSchema)

      expect(isValidationSchemaError(result)).toBe(true)

      if (isValidationSchemaError(result)) {
        expect(result.message).toContain('name')
        expect(result.message).toContain('count')
      }
    })

    test('schema error issues array is populated', () => {
      const result = validateComplexParameterJson('{"name": 123}', testSchema)

      expect(isValidationSchemaError(result)).toBe(true)

      if (isValidationSchemaError(result)) {
        expect(result.issues.length).toBeGreaterThan(0)
        const firstIssue = result.issues[0]
        expect(firstIssue).toBeDefined()
        if (firstIssue) {
          expect(firstIssue.message).toBeTruthy()
        }
      }
    })

    test('parse error cause is a proper Error instance', () => {
      const result = validateComplexParameterJson('invalid json', testSchema)

      expect(isValidationParseError(result)).toBe(true)

      if (isValidationParseError(result)) {
        expect(result.cause).toBeInstanceOf(Error)
        expect(result.cause.message).toBeTruthy()
        // Original error should have stack trace
        expect(result.cause.stack).toBeTruthy()
      }
    })

    test('schema error cause contains Zod error details', () => {
      const result = validateComplexParameterJson('{"name": 123}', testSchema)

      expect(isValidationSchemaError(result)).toBe(true)

      if (isValidationSchemaError(result)) {
        expect(result.cause).toBeInstanceOf(Error)
        const messageContainsField = result.cause.message.includes('name') || result.cause.message.includes('count')
        expect(messageContainsField).toBe(true)
      }
    })
  })

  describe('edge cases', () => {
    test('empty string produces parse error (not crash)', () => {
      const result = validateComplexParameterJson('', testSchema)

      expect(result.success).toBe(false)
      expect(isValidationParseError(result)).toBe(true)
    })

    test('whitespace-only string produces parse error', () => {
      const result = validateComplexParameterJson('   \n\t  ', testSchema)

      expect(result.success).toBe(false)
      expect(isValidationParseError(result)).toBe(true)
    })

    test('empty object with empty schema succeeds', () => {
      const emptySchema = z.object({})
      const result = validateComplexParameterJson('{}', emptySchema)

      expect(result.success).toBe(true)
      if (isValidationSuccess(result)) {
        expect(result.value).toEqual({})
      }
    })

    test('empty array with array schema succeeds', () => {
      const emptyArraySchema = z.array(z.string())
      const result = validateComplexParameterJson('[]', emptyArraySchema)

      expect(result.success).toBe(true)
      if (isValidationSuccess(result)) {
        expect(result.value).toEqual([])
      }
    })

    test('handles very large numbers', () => {
      const numberSchema = z.number()
      const result = validateComplexParameterJson('9007199254740991', numberSchema)

      expect(result.success).toBe(true)
      if (isValidationSuccess(result)) {
        expect(result.value).toBe(Number.MAX_SAFE_INTEGER)
      }
    })

    test('handles very long valid JSON', () => {
      const longObject = { items: Array(1000).fill('x') }
      const json = JSON.stringify(longObject)
      const schema = z.object({ items: z.array(z.string()) })
      const result = validateComplexParameterJson(json, schema)

      expect(result.success).toBe(true)
      if (isValidationSuccess(result)) {
        expect(result.value.items.length).toBe(1000)
      }
    })

    test('handles JSON with escape sequences', () => {
      const json = '{"name": "test\\u0000null\\u0007bell", "count": 1}'
      const result = validateComplexParameterJson(json, testSchema)

      expect(result.success).toBe(true)
      if (isValidationSuccess(result)) {
        expect(result.value.name).toContain('\u0000')
        expect(result.value.name).toContain('\u0007')
      }
    })

    test('type guards are mutually exclusive', () => {
      const successResult = validateComplexParameterJson('{"name": "test", "count": 1}', testSchema)
      const parseErrorResult = validateComplexParameterJson('invalid', testSchema)
      const schemaErrorResult = validateComplexParameterJson('{"name": 123}', testSchema)

      // Success
      expect(isValidationSuccess(successResult)).toBe(true)
      expect(isValidationParseError(successResult)).toBe(false)
      expect(isValidationSchemaError(successResult)).toBe(false)

      // Parse error
      expect(isValidationSuccess(parseErrorResult)).toBe(false)
      expect(isValidationParseError(parseErrorResult)).toBe(true)
      expect(isValidationSchemaError(parseErrorResult)).toBe(false)

      // Schema error
      expect(isValidationSuccess(schemaErrorResult)).toBe(false)
      expect(isValidationParseError(schemaErrorResult)).toBe(false)
      expect(isValidationSchemaError(schemaErrorResult)).toBe(true)
    })

    test('handles record schema with dynamic keys', () => {
      const recordSchema = z.record(z.string(), z.number())
      const result = validateComplexParameterJson('{"a": 1, "b": 2, "c": 3}', recordSchema)

      expect(result.success).toBe(true)
      if (isValidationSuccess(result)) {
        expect(result.value).toEqual({ a: 1, b: 2, c: 3 })
      }
    })

    test('handles tuple schema', () => {
      const tupleSchema = z.tuple([z.string(), z.number(), z.boolean()])
      const result = validateComplexParameterJson('["test", 42, true]', tupleSchema)

      expect(result.success).toBe(true)
      if (isValidationSuccess(result)) {
        expect(result.value).toEqual(['test', 42, true])
      }
    })

    test('handles tuple schema with wrong length', () => {
      const tupleSchema = z.tuple([z.string(), z.number()])
      const result = validateComplexParameterJson('["test"]', tupleSchema)

      expect(result.success).toBe(false)
      expect(isValidationSchemaError(result)).toBe(true)
    })

    test('schema error includes all validation issues', () => {
      const multiErrorSchema = z.object({
        a: z.string(),
        b: z.number(),
        c: z.boolean(),
      })
      const result = validateComplexParameterJson('{"a": 1, "b": "two", "c": "three"}', multiErrorSchema)

      expect(isValidationSchemaError(result)).toBe(true)
      if (isValidationSchemaError(result)) {
        expect(result.issues.length).toBeGreaterThanOrEqual(1)
        // Should have at least one issue for each invalid field
        const paths = result.issues.map((i) => i.path)
        expect(paths.some((p) => p.includes('a')) || paths.some((p) => p.includes('b')) || paths.some((p) => p.includes('c'))).toBe(true)
      }
    })
  })
})
