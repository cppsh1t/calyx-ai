import { describe, expect, test } from 'bun:test'
import { fromOption, getOrElse, isNone, isSome, map, none, some, toOption } from './option.ts'

describe('utility: Option', () => {
  describe('some()', () => {
    test('creates Some option with string value', () => {
      const result = some('hello')
      expect(result).toEqual({ type: 'Some', value: 'hello' })
    })

    test('creates Some option with number value', () => {
      const result = some(42)
      expect(result).toEqual({ type: 'Some', value: 42 })
    })

    test('creates Some option with boolean value', () => {
      const result = some(true)
      expect(result).toEqual({ type: 'Some', value: true })
    })

    test('creates Some option with object value', () => {
      const obj = { foo: 'bar' }
      const result = some(obj)
      expect(result).toEqual({ type: 'Some', value: { foo: 'bar' } })
    })

    test('creates Some option with array value', () => {
      const arr = [1, 2, 3]
      const result = some(arr)
      expect(result).toEqual({ type: 'Some', value: [1, 2, 3] })
    })

    test('creates Some option with empty string', () => {
      const result = some('')
      expect(result).toEqual({ type: 'Some', value: '' })
    })

    test('creates Some option with zero', () => {
      const result = some(0)
      expect(result).toEqual({ type: 'Some', value: 0 })
    })

    test('creates Some option with false', () => {
      const result = some(false)
      expect(result).toEqual({ type: 'Some', value: false })
    })
  })

  describe('none()', () => {
    test('creates None option', () => {
      const result = none()
      expect(result).toEqual({ type: 'None' })
    })

    test('returns consistent None structure', () => {
      const result1 = none()
      const result2 = none()
      expect(result1).toEqual(result2)
    })
  })

  describe('toOption()', () => {
    test('returns None for undefined (clear/unset semantics)', () => {
      const result = toOption(undefined)
      expect(result).toEqual({ type: 'None' })
    })

    test('returns Some for valid string assignment', () => {
      const result = toOption('hello')
      expect(result).toEqual({ type: 'Some', value: 'hello' })
    })

    test('returns Some for valid number assignment', () => {
      const result = toOption(42)
      expect(result).toEqual({ type: 'Some', value: 42 })
    })

    test('returns Some for valid boolean assignment', () => {
      const result = toOption(true)
      expect(result).toEqual({ type: 'Some', value: true })
    })

    test('returns Some for empty string (valid assignment)', () => {
      const result = toOption('')
      expect(result).toEqual({ type: 'Some', value: '' })
    })

    test('returns Some for zero (valid assignment)', () => {
      const result = toOption(0)
      expect(result).toEqual({ type: 'Some', value: 0 })
    })

    test('returns Some for false (valid assignment)', () => {
      const result = toOption(false)
      expect(result).toEqual({ type: 'Some', value: false })
    })

    test('returns Some for null (valid assignment - null is not undefined)', () => {
      const result = toOption(null)
      expect(result).toEqual({ type: 'Some', value: null })
    })

    test('returns Some for object (valid assignment)', () => {
      const obj = { foo: 'bar' }
      const result = toOption(obj)
      expect(result).toEqual({ type: 'Some', value: { foo: 'bar' } })
    })

    test('returns Some for array (valid assignment)', () => {
      const arr = [1, 2, 3]
      const result = toOption(arr)
      expect(result).toEqual({ type: 'Some', value: [1, 2, 3] })
    })
  })

  describe('fromOption()', () => {
    test('returns undefined for None (clear/unset)', () => {
      const result = fromOption({ type: 'None' })
      expect(result).toBeUndefined()
    })

    test('returns value for Some', () => {
      const result = fromOption({ type: 'Some', value: 'hello' })
      expect(result).toBe('hello')
    })

    test('returns number value for Some', () => {
      const result = fromOption({ type: 'Some', value: 42 })
      expect(result).toBe(42)
    })

    test('returns object value for Some', () => {
      const obj = { foo: 'bar' }
      const result = fromOption({ type: 'Some', value: obj })
      expect(result).toEqual({ foo: 'bar' })
    })

    test('returns null value for Some', () => {
      const result = fromOption({ type: 'Some', value: null })
      expect(result).toBeNull()
    })
  })

  describe('isSome()', () => {
    test('returns false for None', () => {
      const result = isSome({ type: 'None' })
      expect(result).toBe(false)
    })

    test('returns true for Some', () => {
      const result = isSome({ type: 'Some', value: 'hello' })
      expect(result).toBe(true)
    })

    test('returns true for Some with any value type', () => {
      expect(isSome({ type: 'Some', value: 0 })).toBe(true)
      expect(isSome({ type: 'Some', value: '' })).toBe(true)
      expect(isSome({ type: 'Some', value: false })).toBe(true)
      expect(isSome({ type: 'Some', value: null })).toBe(true)
      expect(isSome({ type: 'Some', value: [] })).toBe(true)
      expect(isSome({ type: 'Some', value: {} })).toBe(true)
    })

    test('narrows type correctly', () => {
      const option = { type: 'Some' as const, value: 'test' }
      if (isSome(option)) {
        // TypeScript should know option.value exists here
        expect(option.value).toBe('test')
      }
    })
  })

  describe('isNone()', () => {
    test('returns true for None', () => {
      const result = isNone({ type: 'None' })
      expect(result).toBe(true)
    })

    test('returns false for Some', () => {
      const result = isNone({ type: 'Some', value: 'hello' })
      expect(result).toBe(false)
    })

    test('narrows type correctly', () => {
      const option = { type: 'None' as const }
      if (isNone(option)) {
        // TypeScript should know option.type is 'None' here
        expect(option.type).toBe('None')
      }
    })
  })

  describe('map()', () => {
    test('returns None when input is None', () => {
      const result = map({ type: 'None' }, (x: number) => x * 2)
      expect(result).toEqual({ type: 'None' })
    })

    test('applies function to Some value', () => {
      const result = map({ type: 'Some', value: 5 }, (x) => x * 2)
      expect(result).toEqual({ type: 'Some', value: 10 })
    })

    test('transforms string value', () => {
      const result = map({ type: 'Some', value: 'hello' }, (s) => s.toUpperCase())
      expect(result).toEqual({ type: 'Some', value: 'HELLO' })
    })

    test('transforms to different type', () => {
      const result = map({ type: 'Some', value: 42 }, (n) => n.toString())
      expect(result).toEqual({ type: 'Some', value: '42' })
    })

    test('handles complex transformations', () => {
      const result = map({ type: 'Some', value: [1, 2, 3] }, (arr) => arr.length)
      expect(result).toEqual({ type: 'Some', value: 3 })
    })
  })

  describe('getOrElse()', () => {
    test('returns default value when option is None', () => {
      const result = getOrElse({ type: 'None' }, 'default')
      expect(result).toBe('default')
    })

    test('returns contained value when option is Some', () => {
      const result = getOrElse({ type: 'Some', value: 'hello' }, 'default')
      expect(result).toBe('hello')
    })

    test('returns contained value even if falsy', () => {
      expect(getOrElse({ type: 'Some', value: '' }, 'default')).toBe('')
      expect(getOrElse({ type: 'Some', value: 0 }, -1)).toBe(0)
      expect(getOrElse({ type: 'Some', value: false }, true)).toBe(false)
    })

    test('works with different default types', () => {
      expect(getOrElse({ type: 'None' }, 42)).toBe(42)
      expect(getOrElse({ type: 'None' }, true)).toBe(true)
      expect(getOrElse({ type: 'None' }, [1, 2, 3])).toEqual([1, 2, 3])
    })
  })

  describe('round-trip consistency', () => {
    test('toOption -> fromOption returns original for non-undefined', () => {
      const original = 'hello'
      const option = toOption(original)
      const result = fromOption(option)
      expect(result).toBe(original)
    })

    test('toOption -> fromOption returns undefined for undefined', () => {
      const original = undefined
      const option = toOption(original)
      const result = fromOption(option)
      expect(result).toBeUndefined()
    })

    test('fromOption -> toOption returns equivalent for undefined input', () => {
      const original = { type: 'None' } as const
      const unwrapped = fromOption(original)
      const rewrapped = toOption(unwrapped)
      expect(rewrapped).toEqual({ type: 'None' })
    })
  })

  describe('guard paths', () => {
    test('handles undefined guard correctly in toOption', () => {
      // This is the main guard - undefined should map to None
      const guardCases = [undefined]
      for (const testValue of guardCases) {
        const result = toOption(testValue)
        expect(result.type).toBe('None')
      }
    })

    test('falsy values other than undefined are valid assignments', () => {
      const falsyValues = [null, 0, '', false, NaN]
      for (const testValue of falsyValues) {
        const result = toOption(testValue)
        expect(result.type).toBe('Some')
        if (result.type === 'Some') {
          expect(result.value).toBe(testValue)
        }
      }
    })

    test('NaN is preserved as Some(NaN) not converted to None', () => {
      const result = toOption(NaN)
      expect(result.type).toBe('Some')
      if (result.type === 'Some') {
        expect(Number.isNaN(result.value)).toBe(true)
      }
    })

    test('toOption preserves reference equality for objects', () => {
      const obj = { nested: { deep: 'value' } }
      const result = toOption(obj)
      expect(result.type).toBe('Some')
      if (result.type === 'Some') {
        expect(result.value).toBe(obj)
        expect(result.value.nested).toBe(obj.nested)
      }
    })

    test('toOption preserves array reference', () => {
      const arr = [1, 2, 3]
      const result = toOption(arr)
      expect(result.type).toBe('Some')
      if (result.type === 'Some') {
        expect(result.value).toBe(arr)
      }
    })
  })

  describe('edge cases', () => {
    test('map preserves None for all function types', () => {
      const noneOption = { type: 'None' } as const
      expect(map(noneOption, (x: number) => x * 2)).toEqual({ type: 'None' })
      expect(map(noneOption, (x: number) => x)).toEqual({ type: 'None' })
      expect(
        map(noneOption, () => {
          throw new Error('should not call')
        })
      ).toEqual({ type: 'None' })
    })

    test('map handles function that returns undefined', () => {
      const result = map({ type: 'Some', value: 5 }, () => undefined)
      expect(result.type).toBe('Some')
      if (result.type === 'Some') {
        expect(result.value).toBeUndefined()
      }
    })

    test('getOrElse returns default for None even if default is falsy', () => {
      expect(getOrElse({ type: 'None' }, '')).toBe('')
      expect(getOrElse({ type: 'None' }, 0)).toBe(0)
      expect(getOrElse({ type: 'None' }, false)).toBe(false)
      expect(getOrElse({ type: 'None' }, null)).toBeNull()
    })

    test('fromOption round-trips with Option structure', () => {
      // Ensure fromOption doesn't add extra properties
      const someOption = { type: 'Some' as const, value: 42 }
      const unwrapped = fromOption(someOption)
      expect(unwrapped).toBe(42)

      const noneOption = { type: 'None' as const }
      const unwrappedNone = fromOption(noneOption)
      expect(unwrappedNone).toBeUndefined()
    })

    test('isSome type guard correctly narrows in conditional', () => {
      const option = { type: 'Some' as const, value: { nested: 'object' } }
      if (isSome(option)) {
        // Access nested property to verify type narrowing
        expect(option.value.nested).toBe('object')
      } else {
        throw new Error('Should have been narrowed to Some')
      }
    })

    test('isNone type guard correctly narrows in conditional', () => {
      const option = { type: 'None' as const }
      if (isNone(option)) {
        // Verify we can only access type property
        expect(option.type).toBe('None')
      } else {
        throw new Error('Should have been narrowed to None')
      }
    })

    test('some factory accepts any value type without coercion', () => {
      const symbolOption = some(Symbol('test'))
      const bigintOption = some(BigInt(1))
      const functionOption = some(() => {})

      expect(isSome(symbolOption)).toBe(true)
      expect(isSome(bigintOption)).toBe(true)
      expect(isSome(functionOption)).toBe(true)

      if (isSome(symbolOption)) {
        expect(typeof symbolOption.value).toBe('symbol')
      }
      if (isSome(bigintOption)) {
        expect(typeof bigintOption.value).toBe('bigint')
      }
      if (isSome(functionOption)) {
        expect(typeof functionOption.value).toBe('function')
      }
    })
  })
})
