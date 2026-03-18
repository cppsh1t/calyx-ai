import {
  PrimitiveParameterControl,
  createBooleanChangeHandler,
  createClearHandler,
  createNumberChangeHandler,
  createStringChangeHandler,
  detectPrimitiveType,
  isValidNumber,
} from '@/components/PrimitiveParameterControl.tsx'
import { describe, expect, it, jest } from 'bun:test'
import type { NodeParameter, Option } from 'calyx-flow/types'
import type { ChangeEvent } from 'react'
import type { ZodType } from 'zod'

// Helper to create a mock change event
function createMockChangeEvent(value: string | boolean): ChangeEvent<HTMLInputElement> {
  return {
    target: {
      value: typeof value === 'boolean' ? String(value) : value,
      checked: typeof value === 'boolean' ? value : false,
    },
  } as ChangeEvent<HTMLInputElement>
}

// Helper to create test parameters
function createTestParameter<T>(name: string, value: Option<T>, description = ''): NodeParameter {
  return {
    name,
    description,
    schema: {} as unknown as ZodType<T>,
    value: value as Option<unknown>,
  }
}

describe('PrimitiveParameterControl - Helper Functions', () => {
  describe('detectPrimitiveType', () => {
    it('detects string values', () => {
      expect(detectPrimitiveType('hello')).toBe('string')
      expect(detectPrimitiveType('')).toBe('string')
    })

    it('detects number values', () => {
      expect(detectPrimitiveType(42)).toBe('number')
      expect(detectPrimitiveType(0)).toBe('number')
      expect(detectPrimitiveType(-5.5)).toBe('number')
    })

    it('detects boolean values', () => {
      expect(detectPrimitiveType(true)).toBe('boolean')
      expect(detectPrimitiveType(false)).toBe('boolean')
    })

    it('defaults to string for undefined', () => {
      expect(detectPrimitiveType(undefined)).toBe('string')
    })

    it('defaults to string for null', () => {
      expect(detectPrimitiveType(null)).toBe('string')
    })

    it('defaults to string for objects', () => {
      expect(detectPrimitiveType({})).toBe('string')
      expect(detectPrimitiveType([])).toBe('string')
    })
  })

  describe('isValidNumber', () => {
    it('returns true for valid finite numbers', () => {
      expect(isValidNumber(0)).toBe(true)
      expect(isValidNumber(42)).toBe(true)
      expect(isValidNumber(-100)).toBe(true)
      expect(isValidNumber(3.14159)).toBe(true)
      expect(isValidNumber(Number.MAX_SAFE_INTEGER)).toBe(true)
      expect(isValidNumber(Number.MIN_SAFE_INTEGER)).toBe(true)
    })

    it('returns false for NaN', () => {
      expect(isValidNumber(NaN)).toBe(false)
    })

    it('returns false for Infinity', () => {
      expect(isValidNumber(Infinity)).toBe(false)
    })

    it('returns false for negative Infinity', () => {
      expect(isValidNumber(-Infinity)).toBe(false)
    })
  })
})

describe('PrimitiveParameterControl - Handler Functions', () => {
  describe('createStringChangeHandler', () => {
    it('writes Option.Some with string value on change', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createStringChangeHandler(onChange)

      handler(createMockChangeEvent('hello'))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: 'hello' })
    })

    it('writes Option.Some with empty string', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createStringChangeHandler(onChange)

      handler(createMockChangeEvent(''))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: '' })
    })

    it('writes Option.Some with whitespace-only string', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createStringChangeHandler(onChange)

      handler(createMockChangeEvent('   '))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: '   ' })
    })
  })

  describe('createNumberChangeHandler', () => {
    it('writes Option.Some with valid number', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createNumberChangeHandler(onChange)

      handler(createMockChangeEvent('42'))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: 42 })
    })

    it('writes Option.Some with zero', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createNumberChangeHandler(onChange)

      handler(createMockChangeEvent('0'))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: 0 })
    })

    it('writes Option.Some with negative number', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createNumberChangeHandler(onChange)

      handler(createMockChangeEvent('-50'))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: -50 })
    })

    it('writes Option.Some with decimal number', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createNumberChangeHandler(onChange)

      handler(createMockChangeEvent('3.14159'))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: 3.14159 })
    })

    it('writes Option.None for empty string (clear)', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createNumberChangeHandler(onChange)

      handler(createMockChangeEvent(''))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'None' })
    })

    it('blocks NaN assignment (no onChange called)', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createNumberChangeHandler(onChange)

      handler(createMockChangeEvent('not-a-number'))

      expect(received).toHaveLength(0)
    })

    it('blocks Infinity assignment', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createNumberChangeHandler(onChange)

      handler(createMockChangeEvent('Infinity'))

      expect(received).toHaveLength(0)
    })

    it('blocks invalid numeric format', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createNumberChangeHandler(onChange)

      handler(createMockChangeEvent('12.34.56'))

      expect(received).toHaveLength(0)
    })
  })

  describe('createBooleanChangeHandler', () => {
    it('writes Option.Some with true', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createBooleanChangeHandler(onChange)

      handler(createMockChangeEvent(true))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: true })
    })

    it('writes Option.Some with false', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createBooleanChangeHandler(onChange)

      handler(createMockChangeEvent(false))

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'Some', value: false })
    })
  })

  describe('createClearHandler', () => {
    it('writes Option.None', () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createClearHandler(onChange)

      handler()

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ type: 'None' })
    })
  })
})

describe('PrimitiveParameterControl - Component Rendering', () => {
  it('renders without throwing for string parameter', () => {
    const parameter = createTestParameter('test', { type: 'Some', value: 'hello' })
    const onChange = jest.fn()

    expect(() => PrimitiveParameterControl({ parameter, onChange })).not.toThrow()
  })

  it('renders without throwing for number parameter', () => {
    const parameter = createTestParameter('count', { type: 'Some', value: 42 })
    const onChange = jest.fn()

    expect(() => PrimitiveParameterControl({ parameter, onChange })).not.toThrow()
  })

  it('renders without throwing for boolean parameter', () => {
    const parameter = createTestParameter('enabled', { type: 'Some', value: true })
    const onChange = jest.fn()

    expect(() => PrimitiveParameterControl({ parameter, onChange })).not.toThrow()
  })

  it('renders without throwing for None value (defaults to string)', () => {
    const parameter = createTestParameter('empty', { type: 'None' })
    const onChange = jest.fn()

    expect(() => PrimitiveParameterControl({ parameter, onChange })).not.toThrow()
  })

  it('returns a React element', () => {
    const parameter = createTestParameter('test', { type: 'Some', value: 'hello' })
    const onChange = jest.fn()

    const result = PrimitiveParameterControl({ parameter, onChange })

    expect(result).toBeDefined()
    expect(result).not.toBeNull()
  })
})

describe('PrimitiveParameterControl - Parameter Contract', () => {
  it('accepts parameter with all required fields', () => {
    const parameter: NodeParameter = {
      name: 'test',
      description: 'Test parameter',
      schema: {} as unknown as ZodType<unknown>,
      value: { type: 'Some', value: 'test' },
    }

    expect(parameter.name).toBe('test')
    expect(parameter.description).toBe('Test parameter')
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
})

describe('PrimitiveParameterControl - Number Guard Edge Cases', () => {
  const testCases: Array<{
    input: string
    shouldCallOnChange: boolean
    expectedValue?: Option<unknown>
    description: string
  }> = [
    { input: 'abc', shouldCallOnChange: false, description: 'alphabetic string' },
    { input: '12.34.56', shouldCallOnChange: false, description: 'multiple decimals' },
    { input: '', shouldCallOnChange: true, expectedValue: { type: 'None' } as Option<unknown>, description: 'empty string (clear)' },
    { input: 'NaN', shouldCallOnChange: false, description: 'NaN literal' },
    { input: 'Infinity', shouldCallOnChange: false, description: 'Infinity literal' },
    { input: '-Infinity', shouldCallOnChange: false, description: 'negative Infinity literal' },
    { input: '1e309', shouldCallOnChange: false, description: 'overflow to Infinity' },
    { input: '42', shouldCallOnChange: true, expectedValue: { type: 'Some', value: 42 } as Option<unknown>, description: 'valid integer' },
    { input: '3.14', shouldCallOnChange: true, expectedValue: { type: 'Some', value: 3.14 } as Option<unknown>, description: 'valid decimal' },
    { input: '-100', shouldCallOnChange: true, expectedValue: { type: 'Some', value: -100 } as Option<unknown>, description: 'valid negative' },
  ]

  testCases.forEach(({ input, shouldCallOnChange, expectedValue, description }) => {
    it(`handles ${description}: "${input}"`, () => {
      const received: Option<unknown>[] = []
      const onChange = (value: Option<unknown>) => received.push(value)
      const handler = createNumberChangeHandler(onChange)

      handler(createMockChangeEvent(input))

      if (shouldCallOnChange) {
        expect(received).toHaveLength(1)
        expect(received[0]).toEqual(expectedValue)
      } else {
        expect(received).toHaveLength(0)
      }
    })
  })
})

describe('PrimitiveParameterControl - Integration Scenarios', () => {
  it('handles complete string editing workflow', () => {
    const received: Option<unknown>[] = []
    const onChange = (value: Option<unknown>) => received.push(value)

    // Initial value
    const parameter = createTestParameter('username', { type: 'Some', value: 'john' })
    expect(parameter.value).toEqual({ type: 'Some', value: 'john' })

    // Edit to new value
    const editHandler = createStringChangeHandler(onChange)
    editHandler(createMockChangeEvent('jane'))
    expect(received[0]).toEqual({ type: 'Some', value: 'jane' })

    // Clear value
    const clearHandler = createClearHandler(onChange)
    clearHandler()
    expect(received[1]).toEqual({ type: 'None' })

    expect(received).toHaveLength(2)
  })

  it('handles complete number editing workflow with guards', () => {
    const received: Option<unknown>[] = []
    const onChange = (value: Option<unknown>) => received.push(value)
    const handler = createNumberChangeHandler(onChange)

    // Valid edit
    handler(createMockChangeEvent('100'))
    expect(received[0]).toEqual({ type: 'Some', value: 100 })

    // Invalid (NaN) - should not trigger onChange
    handler(createMockChangeEvent('invalid'))
    expect(received).toHaveLength(1) // No new entry

    // Another valid edit
    handler(createMockChangeEvent('200'))
    expect(received[1]).toEqual({ type: 'Some', value: 200 })

    // Clear
    const clearHandler = createClearHandler(onChange)
    clearHandler()
    expect(received[2]).toEqual({ type: 'None' })

    expect(received).toHaveLength(3)
  })

  it('parameter targeting ensures scoped updates', () => {
    const paramAUpdates: Option<unknown>[] = []
    const paramBUpdates: Option<unknown>[] = []

    const onChangeA = (value: Option<unknown>) => paramAUpdates.push(value)
    const onChangeB = (value: Option<unknown>) => paramBUpdates.push(value)

    // Update param A
    createStringChangeHandler(onChangeA)(createMockChangeEvent('valueA'))

    // Update param B
    createStringChangeHandler(onChangeB)(createMockChangeEvent('valueB'))

    // Clear param A
    createClearHandler(onChangeA)()

    expect(paramAUpdates).toHaveLength(2)
    expect(paramAUpdates[0]).toEqual({ type: 'Some', value: 'valueA' })
    expect(paramAUpdates[1]).toEqual({ type: 'None' })

    expect(paramBUpdates).toHaveLength(1)
    expect(paramBUpdates[0]).toEqual({ type: 'Some', value: 'valueB' })
  })
})
