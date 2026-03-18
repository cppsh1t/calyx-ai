import { classifyValue, isComplex, isPrimitive } from '@/utils/classify.ts'
import { fromOption, some, toOption } from '@/utils/option.ts'
import { describe, expect, test } from 'bun:test'

describe('utility: option value invariants', () => {
  describe('Option conversion invariants', () => {
    test('undefined always maps to None', () => {
      const result = toOption(undefined)
      expect(result).toEqual({ type: 'None' })
    })

    test('falsy values remain Some: 0', () => {
      const result = toOption(0)
      expect(result).toEqual({ type: 'Some', value: 0 })
    })

    test('falsy values remain Some: empty string', () => {
      const result = toOption('')
      expect(result).toEqual({ type: 'Some', value: '' })
    })

    test('falsy values remain Some: false', () => {
      const result = toOption(false)
      expect(result).toEqual({ type: 'Some', value: false })
    })

    test('falsy values remain Some: null', () => {
      const result = toOption(null)
      expect(result).toEqual({ type: 'Some', value: null })
    })

    test('falsy values remain Some: NaN', () => {
      const result = toOption(NaN)
      expect(result.type).toBe('Some')
      if (result.type === 'Some') {
        expect(Number.isNaN(result.value)).toBe(true)
      }
    })

    test('toOption -> fromOption round-trip preserves primitive values', () => {
      const values = ['hello', 42, true, false, 0, '', null]
      for (const value of values) {
        const option = toOption(value)
        const unwrapped = fromOption(option)
        expect(unwrapped).toBe(value)
      }
    })

    test('toOption -> fromOption round-trip preserves object reference', () => {
      const obj = { nested: { deep: 'value' } }
      const option = toOption(obj)
      const unwrapped = fromOption(option)
      expect(unwrapped).toBe(obj)
    })

    test('toOption -> fromOption round-trip preserves array reference', () => {
      const arr = [1, 2, { key: 'value' }]
      const option = toOption(arr)
      const unwrapped = fromOption(option)
      expect(unwrapped).toBe(arr)
    })

    test('round-trip with undefined is idempotent', () => {
      const firstPass = toOption(undefined)
      const unwrapped = fromOption(firstPass)
      const secondPass = toOption(unwrapped)
      expect(firstPass).toEqual(secondPass)
      expect(firstPass).toEqual({ type: 'None' })
    })

    test('fromOption -> toOption round-trip for None yields None', () => {
      const noneOption = { type: 'None' } as const
      const unwrapped = fromOption(noneOption)
      const rewrapped = toOption(unwrapped)
      expect(rewrapped).toEqual({ type: 'None' })
    })

    test('fromOption -> toOption round-trip for Some preserves structure', () => {
      const nestedOption = { type: 'Some', value: 'test' } as const
      const someOption = some(nestedOption)
      expect(someOption.type).toBe('Some')
      if (someOption.type === 'Some') {
        const unwrapped = fromOption(someOption)
        const rewrapped = toOption(unwrapped)
        expect(rewrapped).toEqual({ type: 'Some', value: { type: 'Some', value: 'test' } })
      }
    })

    test('some factory preserves value identity', () => {
      const obj = { key: 'value' }
      const result = some(obj)
      expect(result.type).toBe('Some')
      if (result.type === 'Some') {
        expect(result.value).toBe(obj)
      }
    })
  })

  describe('Classification invariants for edge values', () => {
    test('NaN is primitive (number)', () => {
      expect(isPrimitive(NaN)).toBe(true)
      expect(isComplex(NaN)).toBe(false)
      expect(classifyValue(NaN)).toBe('number')
    })

    test('Infinity is primitive (number)', () => {
      expect(isPrimitive(Infinity)).toBe(true)
      expect(isPrimitive(-Infinity)).toBe(true)
      expect(isComplex(Infinity)).toBe(false)
      expect(isComplex(-Infinity)).toBe(false)
      expect(classifyValue(Infinity)).toBe('number')
      expect(classifyValue(-Infinity)).toBe('number')
    })

    test('null is complex (not primitive)', () => {
      expect(isPrimitive(null)).toBe(false)
      expect(isComplex(null)).toBe(true)
      expect(classifyValue(null)).toBe('null')
    })

    test('undefined is neither primitive nor complex', () => {
      expect(isPrimitive(undefined)).toBe(false)
      expect(isComplex(undefined)).toBe(false)
      expect(classifyValue(undefined)).toBe('undefined')
    })

    test('empty string is primitive', () => {
      expect(isPrimitive('')).toBe(true)
      expect(isComplex('')).toBe(false)
      expect(classifyValue('')).toBe('string')
    })

    test('zero is primitive (number)', () => {
      expect(isPrimitive(0)).toBe(true)
      expect(isPrimitive(-0)).toBe(true)
      expect(isComplex(0)).toBe(false)
      expect(classifyValue(0)).toBe('number')
    })

    test('false is primitive (boolean)', () => {
      expect(isPrimitive(false)).toBe(true)
      expect(isComplex(false)).toBe(false)
      expect(classifyValue(false)).toBe('boolean')
    })

    test('empty array is complex', () => {
      expect(isPrimitive([])).toBe(false)
      expect(isComplex([])).toBe(true)
      expect(classifyValue([])).toBe('array')
    })

    test('empty object is complex', () => {
      expect(isPrimitive({})).toBe(false)
      expect(isComplex({})).toBe(true)
      expect(classifyValue({})).toBe('object')
    })

    test('boxed primitives are complex (not primitive)', () => {
      // eslint-disable-next-line no-new-wrappers
      expect(isPrimitive(new String('test'))).toBe(false)
      // eslint-disable-next-line no-new-wrappers
      expect(isPrimitive(new Number(42))).toBe(false)
      // eslint-disable-next-line no-new-wrappers
      expect(isPrimitive(new Boolean(true))).toBe(false)

      // eslint-disable-next-line no-new-wrappers
      expect(isComplex(new String('test'))).toBe(true)
      // eslint-disable-next-line no-new-wrappers
      expect(isComplex(new Number(42))).toBe(true)
      // eslint-disable-next-line no-new-wrappers
      expect(isComplex(new Boolean(true))).toBe(true)
    })

    test('symbols are neither primitive nor complex', () => {
      const sym = Symbol('test')
      expect(isPrimitive(sym)).toBe(false)
      expect(isComplex(sym)).toBe(false)
      expect(classifyValue(sym)).toBe('symbol')
    })

    test('bigint is neither primitive nor complex', () => {
      const big = BigInt(1)
      expect(isPrimitive(big)).toBe(false)
      expect(isComplex(big)).toBe(false)
      expect(classifyValue(big)).toBe('bigint')
    })

    test('functions are neither primitive nor complex', () => {
      const fn = () => {}
      expect(isPrimitive(fn)).toBe(false)
      expect(isComplex(fn)).toBe(false)
      expect(classifyValue(fn)).toBe('function')
    })

    test('typed arrays are complex (not primitive)', () => {
      const typed = new Uint8Array([1, 2, 3])
      expect(isPrimitive(typed)).toBe(false)
      expect(isComplex(typed)).toBe(true)
      expect(classifyValue(typed)).toBe('object')
    })

    test('Date objects are complex', () => {
      const date = new Date()
      expect(isPrimitive(date)).toBe(false)
      expect(isComplex(date)).toBe(true)
      expect(classifyValue(date)).toBe('object')
    })

    test('RegExp objects are complex', () => {
      const regex = /test/g
      expect(isPrimitive(regex)).toBe(false)
      expect(isComplex(regex)).toBe(true)
      expect(classifyValue(regex)).toBe('object')
    })

    test('Map and Set are complex', () => {
      expect(isPrimitive(new Map())).toBe(false)
      expect(isPrimitive(new Set())).toBe(false)
      expect(isComplex(new Map())).toBe(true)
      expect(isComplex(new Set())).toBe(true)
      expect(classifyValue(new Map())).toBe('object')
      expect(classifyValue(new Set())).toBe('object')
    })

    test('primitive vs complex are mutually exclusive', () => {
      const testValues = [
        'hello',
        '',
        42,
        0,
        NaN,
        Infinity,
        -Infinity,
        true,
        false,
        null,
        undefined,
        {},
        [],
        [1, 2, 3],
        { key: 'value' },
        new Date(),
        /regex/,
        new Map(),
        new Set(),
        Symbol('test'),
        BigInt(1),
        () => {},
      ]

      for (const value of testValues) {
        const isPrim = isPrimitive(value)
        const isComp = isComplex(value)
        // A value cannot be both primitive and complex
        expect(isPrim && isComp).toBe(false)
      }
    })
  })

  describe('Integration: Option values maintain classification through round-trip', () => {
    test('primitive values maintain classification after Option round-trip', () => {
      const primitives = ['hello', 42, true, false, 0, '', NaN, Infinity]

      for (const value of primitives) {
        const option = toOption(value)
        const unwrapped = fromOption(option)

        // Classification should be preserved
        expect(isPrimitive(unwrapped)).toBe(true)
        expect(isComplex(unwrapped)).toBe(false)

        // Type should match original
        expect(classifyValue(unwrapped)).toBe(classifyValue(value))
      }
    })

    test('complex values maintain classification after Option round-trip', () => {
      const complexValues = [null, {}, [], { key: 'value' }, [1, 2, 3]]

      for (const value of complexValues) {
        const option = toOption(value)
        const unwrapped = fromOption(option)

        // Classification should be preserved
        expect(isPrimitive(unwrapped)).toBe(false)
        expect(isComplex(unwrapped)).toBe(true)

        // Type should match original
        expect(classifyValue(unwrapped)).toBe(classifyValue(value))
      }
    })

    test('undefined maintains undefined classification through Option', () => {
      const option = toOption(undefined)
      const unwrapped = fromOption(option)

      expect(unwrapped).toBeUndefined()
      expect(isPrimitive(unwrapped)).toBe(false)
      expect(isComplex(unwrapped)).toBe(false)
      expect(classifyValue(unwrapped)).toBe('undefined')
    })

    test('null is preserved as Some(null) and maintains complex classification', () => {
      const option = toOption(null)
      expect(option.type).toBe('Some')

      if (option.type === 'Some') {
        expect(option.value).toBeNull()
        expect(isComplex(option.value)).toBe(true)
        expect(isPrimitive(option.value)).toBe(false)
      }

      const unwrapped = fromOption(option)
      expect(unwrapped).toBeNull()
      expect(isComplex(unwrapped)).toBe(true)
    })
  })

  describe('Edge case invariants', () => {
    test('negative zero maintains value and classification', () => {
      const option = toOption(-0)
      expect(option.type).toBe('Some')

      if (option.type === 'Some') {
        expect(option.value).toBe(-0)
        expect(isPrimitive(option.value)).toBe(true)
        expect(Object.is(option.value, -0)).toBe(true)
      }
    })

    test('very large numbers maintain classification', () => {
      const large = Number.MAX_SAFE_INTEGER
      const option = toOption(large)
      const unwrapped = fromOption(option)

      expect(unwrapped).toBe(large)
      expect(isPrimitive(unwrapped)).toBe(true)
      expect(classifyValue(unwrapped)).toBe('number')
    })

    test('very small numbers maintain classification', () => {
      const small = Number.MIN_SAFE_INTEGER
      const option = toOption(small)
      const unwrapped = fromOption(option)

      expect(unwrapped).toBe(small)
      expect(isPrimitive(unwrapped)).toBe(true)
      expect(classifyValue(unwrapped)).toBe('number')
    })

    test('nested structures maintain classification through Option', () => {
      const nested = { arr: [1, 2, { deep: 'value' }], nullField: null }
      const option = toOption(nested)
      const unwrapped = fromOption(option)

      expect(unwrapped).toBe(nested)
      expect(isComplex(unwrapped)).toBe(true)
      expect(classifyValue(unwrapped)).toBe('object')
    })

    test('sparse arrays maintain classification through Option', () => {
      // eslint-disable-next-line no-sparse-arrays
      const sparse = [1, , 3]
      const option = toOption(sparse)
      const unwrapped = fromOption(option)

      expect(unwrapped).toBe(sparse)
      expect(isComplex(unwrapped)).toBe(true)
      expect(classifyValue(unwrapped)).toBe('array')
    })
  })
})
