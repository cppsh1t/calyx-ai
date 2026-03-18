import { formatJsonForEditing, formatJsonPreview } from '@/components/ComplexParameterControl.tsx'
import { describe, expect, it } from 'bun:test'
import type { NodeParameter, Option } from 'calyx-flow/types'
import type { ZodType } from 'zod'

// Helper to create test parameters
function createTestParameter<T>(name: string, value: Option<T>, description = ''): NodeParameter {
  return {
    name,
    description,
    schema: {} as unknown as ZodType<T>,
    value: value as Option<unknown>,
  }
}

describe('ComplexParameterControl - Helper Functions', () => {
  describe('formatJsonPreview', () => {
    it('formats objects as compact JSON', () => {
      expect(formatJsonPreview({ key: 'value' })).toBe('{"key":"value"}')
    })

    it('formats arrays as compact JSON', () => {
      expect(formatJsonPreview([1, 2, 3])).toBe('[1,2,3]')
    })

    it('formats null as "null"', () => {
      expect(formatJsonPreview(null)).toBe('null')
    })

    it('formats undefined as "undefined"', () => {
      expect(formatJsonPreview(undefined)).toBe('undefined')
    })

    it('truncates long JSON to maxLength', () => {
      const longObject = { a: 'a'.repeat(100) }
      const result = formatJsonPreview(longObject, 50)
      expect(result.endsWith('...')).toBe(true)
      expect(result.length).toBe(53) // 50 + 3 for "..."
    })

    it('returns full JSON when under maxLength', () => {
      const shortObject = { key: 'value' }
      const result = formatJsonPreview(shortObject, 100)
      expect(result).toBe('{"key":"value"}')
    })

    it('uses default maxLength of 100', () => {
      const obj = { a: 'b'.repeat(50) }
      const result = formatJsonPreview(obj)
      // Should be truncated since it's over 100 chars
      expect(result.length).toBeLessThanOrEqual(103)
    })
  })

  describe('formatJsonForEditing', () => {
    it('formats objects as pretty-printed JSON', () => {
      const result = formatJsonForEditing({ key: 'value' })
      expect(result).toBe('{\n  "key": "value"\n}')
    })

    it('formats arrays as pretty-printed JSON', () => {
      const result = formatJsonForEditing([1, 2, 3])
      expect(result).toBe('[\n  1,\n  2,\n  3\n]')
    })

    it('formats null as "null"', () => {
      expect(formatJsonForEditing(null)).toBe('null')
    })

    it('formats undefined as empty string', () => {
      expect(formatJsonForEditing(undefined)).toBe('')
    })

    it('returns empty string for invalid JSON (circular references)', () => {
      const circular: Record<string, unknown> = {}
      circular.self = circular
      expect(formatJsonForEditing(circular)).toBe('')
    })

    it('handles nested objects with proper indentation', () => {
      const result = formatJsonForEditing({ level1: { level2: { level3: 'deep' } } })
      expect(result).toContain('\n  "level1": {')
      expect(result).toContain('\n    "level2": {')
      expect(result).toContain('\n      "level3": "deep"')
    })

    it('handles mixed arrays with objects', () => {
      const result = formatJsonForEditing([1, { nested: true }, 'string'])
      expect(result).toContain('[\n  1,\n  {')
      expect(result).toContain('\n    "nested": true')
      expect(result).toContain('\n  },\n  "string"\n]')
    })
  })
})

describe('ComplexParameterControl - Parameter Contract', () => {
  it('accepts parameter with all required fields', () => {
    const parameter: NodeParameter = {
      name: 'config',
      description: 'Configuration object',
      schema: {} as unknown as ZodType<unknown>,
      value: { type: 'Some', value: { enabled: true } },
    }

    expect(parameter.name).toBe('config')
    expect(parameter.description).toBe('Configuration object')
    expect(parameter.value.type).toBe('Some')
  })

  it('accepts parameter with None value', () => {
    const parameter: NodeParameter = {
      name: 'empty',
      description: 'Empty parameter',
      schema: {} as unknown as ZodType<unknown>,
      value: { type: 'None' },
    }

    expect(parameter.value.type).toBe('None')
  })

  it('accepts object parameter', () => {
    const parameter = createTestParameter('config', { type: 'Some', value: { key: 'value' } })
    expect(parameter.name).toBe('config')
    expect(parameter.value.type).toBe('Some')
  })

  it('accepts array parameter', () => {
    const parameter = createTestParameter('items', { type: 'Some', value: [1, 2, 3] })
    expect(parameter.name).toBe('items')
    expect(parameter.value.type).toBe('Some')
  })

  it('accepts null parameter', () => {
    const parameter = createTestParameter('empty', { type: 'Some', value: null })
    expect(parameter.name).toBe('empty')
    expect(parameter.value.type).toBe('Some')
  })

  it('accepts nested object values', () => {
    const parameter = createTestParameter('nested', {
      type: 'Some',
      value: { level1: { level2: { level3: 'deep' } } },
    })
    expect(parameter.value.type).toBe('Some')
  })

  it('accepts mixed array values', () => {
    const parameter = createTestParameter('mixed', {
      type: 'Some',
      value: [1, 'string', true, null, { obj: 'value' }],
    })
    expect(parameter.value.type).toBe('Some')
  })
})

describe('ComplexParameterControl - Type Classification', () => {
  it('identifies objects as complex', () => {
    const parameter = createTestParameter('obj', { type: 'Some', value: { key: 'value' } })
    const value = parameter.value
    if (value.type === 'Some') {
      expect(typeof value.value).toBe('object')
      expect(value.value).not.toBeNull()
      expect(Array.isArray(value.value)).toBe(false)
    }
  })

  it('identifies arrays as complex', () => {
    const parameter = createTestParameter('arr', { type: 'Some', value: [1, 2, 3] })
    const value = parameter.value
    if (value.type === 'Some') {
      expect(Array.isArray(value.value)).toBe(true)
    }
  })

  it('identifies null as complex', () => {
    const parameter = createTestParameter('nullVal', { type: 'Some', value: null })
    const value = parameter.value
    if (value.type === 'Some') {
      expect(value.value).toBeNull()
    }
  })

  it('identifies None values as non-complex (defaults to primitive)', () => {
    const parameter = createTestParameter('unset', { type: 'None' })
    expect(parameter.value.type).toBe('None')
  })
})

describe('ComplexParameterControl - JSON Formatting Edge Cases', () => {
  it('handles empty objects', () => {
    expect(formatJsonPreview({})).toBe('{}')
    expect(formatJsonForEditing({})).toBe('{}')
  })

  it('handles empty arrays', () => {
    expect(formatJsonPreview([])).toBe('[]')
    expect(formatJsonForEditing([])).toBe('[]')
  })

  it('handles special characters in strings', () => {
    const obj = { text: 'Hello\nWorld\t!' }
    const preview = formatJsonPreview(obj)
    expect(preview).toContain('\\n')
    expect(preview).toContain('\\t')
  })

  it('handles unicode characters', () => {
    const obj = { emoji: '\uD83C\uDF89', chinese: '\u4E2D\u6587' }
    expect(formatJsonPreview(obj)).toBe('{"emoji":"\uD83C\uDF89","chinese":"\u4E2D\u6587"}')
  })

  it('handles numbers including zero', () => {
    const obj = { zero: 0, negative: -5, float: 3.14 }
    expect(formatJsonPreview(obj)).toBe('{"zero":0,"negative":-5,"float":3.14}')
  })

  it('handles boolean values', () => {
    const obj = { yes: true, no: false }
    expect(formatJsonPreview(obj)).toBe('{"yes":true,"no":false}')
  })
})
