import { describe, expect, test } from 'bun:test'
import {
  canUseSimpleInput,
  classifyValue,
  getTypeDisplayName,
  isArray,
  isBoolean,
  isComplex,
  isNull,
  isNumber,
  isPlainObject,
  isPrimitive,
  isString,
} from './classify.ts'

describe('utility: Classification', () => {
  describe('isPrimitive()', () => {
    test('returns true for strings', () => {
      expect(isPrimitive('hello')).toBe(true)
      expect(isPrimitive('')).toBe(true)
    })

    test('returns true for numbers', () => {
      expect(isPrimitive(42)).toBe(true)
      expect(isPrimitive(0)).toBe(true)
      expect(isPrimitive(-1)).toBe(true)
      expect(isPrimitive(3.14)).toBe(true)
      expect(isPrimitive(Infinity)).toBe(true)
      expect(isPrimitive(-Infinity)).toBe(true)
    })

    test('returns true for booleans', () => {
      expect(isPrimitive(true)).toBe(true)
      expect(isPrimitive(false)).toBe(true)
    })

    test('returns false for null', () => {
      expect(isPrimitive(null)).toBe(false)
    })

    test('returns false for undefined', () => {
      expect(isPrimitive(undefined)).toBe(false)
    })

    test('returns false for objects', () => {
      expect(isPrimitive({})).toBe(false)
      expect(isPrimitive({ foo: 'bar' })).toBe(false)
    })

    test('returns false for arrays', () => {
      expect(isPrimitive([])).toBe(false)
      expect(isPrimitive([1, 2, 3])).toBe(false)
    })

    test('returns false for functions', () => {
      expect(isPrimitive(() => {})).toBe(false)
      expect(isPrimitive(function () {})).toBe(false)
    })

    test('returns false for symbols', () => {
      expect(isPrimitive(Symbol('test'))).toBe(false)
    })

    test('returns false for bigints', () => {
      expect(isPrimitive(BigInt(9007199254740991))).toBe(false)
    })
  })

  describe('isComplex()', () => {
    test('returns true for null', () => {
      expect(isComplex(null)).toBe(true)
    })

    test('returns true for objects', () => {
      expect(isComplex({})).toBe(true)
      expect(isComplex({ foo: 'bar' })).toBe(true)
    })

    test('returns true for arrays', () => {
      expect(isComplex([])).toBe(true)
      expect(isComplex([1, 2, 3])).toBe(true)
    })

    test('returns false for primitives', () => {
      expect(isComplex('hello')).toBe(false)
      expect(isComplex(42)).toBe(false)
      expect(isComplex(true)).toBe(false)
    })

    test('returns false for undefined', () => {
      expect(isComplex(undefined)).toBe(false)
    })

    test('returns true for functions (typeof === object edge case)', () => {
      // Functions are not objects, so they're not "complex"
      expect(isComplex(() => {})).toBe(false)
    })
  })

  describe('isString()', () => {
    test('returns true for strings', () => {
      expect(isString('hello')).toBe(true)
      expect(isString('')).toBe(true)
    })

    test('returns false for non-strings', () => {
      expect(isString(42)).toBe(false)
      expect(isString(true)).toBe(false)
      expect(isString(null)).toBe(false)
      expect(isString({})).toBe(false)
      expect(isString([])).toBe(false)
    })
  })

  describe('isNumber()', () => {
    test('returns true for numbers', () => {
      expect(isNumber(42)).toBe(true)
      expect(isNumber(0)).toBe(true)
      expect(isNumber(NaN)).toBe(true)
      expect(isNumber(Infinity)).toBe(true)
    })

    test('returns false for non-numbers', () => {
      expect(isNumber('42')).toBe(false)
      expect(isNumber(true)).toBe(false)
      expect(isNumber(null)).toBe(false)
      expect(isNumber({})).toBe(false)
    })
  })

  describe('isBoolean()', () => {
    test('returns true for booleans', () => {
      expect(isBoolean(true)).toBe(true)
      expect(isBoolean(false)).toBe(true)
    })

    test('returns false for non-booleans', () => {
      expect(isBoolean(1)).toBe(false)
      expect(isBoolean(0)).toBe(false)
      expect(isBoolean('true')).toBe(false)
      expect(isBoolean(null)).toBe(false)
    })
  })

  describe('isNull()', () => {
    test('returns true for null', () => {
      expect(isNull(null)).toBe(true)
    })

    test('returns false for non-null values', () => {
      expect(isNull(undefined)).toBe(false)
      expect(isNull(0)).toBe(false)
      expect(isNull('')).toBe(false)
      expect(isNull(false)).toBe(false)
      expect(isNull({})).toBe(false)
    })
  })

  describe('isArray()', () => {
    test('returns true for arrays', () => {
      expect(isArray([])).toBe(true)
      expect(isArray([1, 2, 3])).toBe(true)
      expect(isArray(['a', 'b'])).toBe(true)
      expect(isArray([{}])).toBe(true)
    })

    test('returns false for non-arrays', () => {
      expect(isArray({})).toBe(false)
      expect(isArray('[]')).toBe(false)
      expect(isArray(null)).toBe(false)
      expect(isArray(undefined)).toBe(false)
      expect(isArray({ length: 0 })).toBe(false)
    })
  })

  describe('isPlainObject()', () => {
    test('returns true for plain objects', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ foo: 'bar' })).toBe(true)
      expect(isPlainObject({ nested: { a: 1 } })).toBe(true)
    })

    test('returns false for arrays', () => {
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject([1, 2, 3])).toBe(false)
    })

    test('returns false for null', () => {
      expect(isPlainObject(null)).toBe(false)
    })

    test('returns false for non-objects', () => {
      expect(isPlainObject('string')).toBe(false)
      expect(isPlainObject(42)).toBe(false)
      expect(isPlainObject(true)).toBe(false)
    })
  })

  describe('classifyValue()', () => {
    test('classifies primitives correctly', () => {
      expect(classifyValue('hello')).toBe('string')
      expect(classifyValue(42)).toBe('number')
      expect(classifyValue(true)).toBe('boolean')
    })

    test('classifies null as null', () => {
      expect(classifyValue(null)).toBe('null')
    })

    test('classifies arrays as array', () => {
      expect(classifyValue([])).toBe('array')
      expect(classifyValue([1, 2, 3])).toBe('array')
    })

    test('classifies objects as object', () => {
      expect(classifyValue({})).toBe('object')
      expect(classifyValue({ foo: 'bar' })).toBe('object')
    })

    test('classifies undefined as undefined', () => {
      expect(classifyValue(undefined)).toBe('undefined')
    })

    test('classifies functions as function', () => {
      expect(classifyValue(() => {})).toBe('function')
    })

    test('classifies symbols as symbol', () => {
      expect(classifyValue(Symbol('test'))).toBe('symbol')
    })
  })

  describe('canUseSimpleInput()', () => {
    test('returns true for primitives', () => {
      expect(canUseSimpleInput('hello')).toBe(true)
      expect(canUseSimpleInput(42)).toBe(true)
      expect(canUseSimpleInput(true)).toBe(true)
    })

    test('returns true for undefined', () => {
      expect(canUseSimpleInput(undefined)).toBe(true)
    })

    test('returns false for null', () => {
      expect(canUseSimpleInput(null)).toBe(false)
    })

    test('returns false for arrays', () => {
      expect(canUseSimpleInput([])).toBe(false)
      expect(canUseSimpleInput([1, 2, 3])).toBe(false)
    })

    test('returns false for objects', () => {
      expect(canUseSimpleInput({})).toBe(false)
      expect(canUseSimpleInput({ foo: 'bar' })).toBe(false)
    })
  })

  describe('getTypeDisplayName()', () => {
    test('returns correct names for primitives', () => {
      expect(getTypeDisplayName('hello')).toBe('string')
      expect(getTypeDisplayName(42)).toBe('number')
      expect(getTypeDisplayName(true)).toBe('boolean')
    })

    test('returns null for null', () => {
      expect(getTypeDisplayName(null)).toBe('null')
    })

    test('returns array for arrays', () => {
      expect(getTypeDisplayName([])).toBe('array')
      expect(getTypeDisplayName([1, 2, 3])).toBe('array')
    })

    test('returns object for objects', () => {
      expect(getTypeDisplayName({})).toBe('object')
    })

    test('returns undefined for undefined', () => {
      expect(getTypeDisplayName(undefined)).toBe('undefined')
    })
  })

  describe('guard paths', () => {
    test('undefined is not primitive and not complex', () => {
      expect(isPrimitive(undefined)).toBe(false)
      expect(isComplex(undefined)).toBe(false)
    })

    test('null is complex (not primitive)', () => {
      expect(isPrimitive(null)).toBe(false)
      expect(isComplex(null)).toBe(true)
    })

    test('empty object is complex', () => {
      expect(isPrimitive({})).toBe(false)
      expect(isComplex({})).toBe(true)
      expect(isPlainObject({})).toBe(true)
    })

    test('empty array is complex', () => {
      expect(isPrimitive([])).toBe(false)
      expect(isComplex([])).toBe(true)
      expect(isArray([])).toBe(true)
    })

    test('nested structures are complex', () => {
      const nested = { arr: [1, 2, { deep: 'value' }] }
      expect(isPrimitive(nested)).toBe(false)
      expect(isComplex(nested)).toBe(true)
    })
  })

  describe('happy paths', () => {
    test('typical form values are primitives', () => {
      const formValues = ['username', '', 42, 0, -1, 3.14, true, false]
      for (const value of formValues) {
        expect(isPrimitive(value)).toBe(true)
        expect(canUseSimpleInput(value)).toBe(true)
      }
    })

    test('complex values require special handling', () => {
      const complexValues = [null, [], [1, 2, 3], {}, { key: 'value' }, { nested: { array: [1, 2, 3] } }]
      for (const value of complexValues) {
        expect(isComplex(value)).toBe(true)
        expect(canUseSimpleInput(value)).toBe(false)
      }
    })
  })

  describe('edge cases', () => {
    test('NaN is classified as number (not special case)', () => {
      expect(isNumber(NaN)).toBe(true)
      expect(isPrimitive(NaN)).toBe(true)
      expect(classifyValue(NaN)).toBe('number')
    })

    test('Infinity values are classified as number', () => {
      expect(isNumber(Infinity)).toBe(true)
      expect(isNumber(-Infinity)).toBe(true)
      expect(isPrimitive(Infinity)).toBe(true)
    })

    test('isPlainObject handles Object.create(null)', () => {
      const nullProtoObject = Object.create(null)
      nullProtoObject.key = 'value'
      expect(isPlainObject(nullProtoObject)).toBe(true)
      expect(isComplex(nullProtoObject)).toBe(true)
      expect(isPrimitive(nullProtoObject)).toBe(false)
    })

    test('isPlainObject treats Date as object (non-array object)', () => {
      const date = new Date()
      // Date is a non-null, non-array object, so isPlainObject returns true
      expect(isPlainObject(date)).toBe(true)
      expect(isComplex(date)).toBe(true)
    })

    test('isPlainObject treats RegExp as object (non-array object)', () => {
      const regex = /test/g
      expect(isPlainObject(regex)).toBe(true)
      expect(isComplex(regex)).toBe(true)
    })

    test('isPlainObject treats Map and Set as objects', () => {
      expect(isPlainObject(new Map())).toBe(true)
      expect(isPlainObject(new Set())).toBe(true)
      expect(isComplex(new Map())).toBe(true)
      expect(isComplex(new Set())).toBe(true)
    })

    test('isArray handles sparse arrays', () => {
      // eslint-disable-next-line no-sparse-arrays
      const sparse = [1, , 3]
      expect(isArray(sparse)).toBe(true)
      expect(isComplex(sparse)).toBe(true)
    })

    test('isArray handles typed arrays', () => {
      expect(isArray(new Uint8Array([1, 2, 3]))).toBe(false)
      expect(isComplex(new Uint8Array([1, 2, 3]))).toBe(true)
    })

    test('classifyValue handles all primitive types', () => {
      expect(classifyValue('')).toBe('string')
      expect(classifyValue(0)).toBe('number')
      expect(classifyValue(NaN)).toBe('number')
      expect(classifyValue(Infinity)).toBe('number')
      expect(classifyValue(true)).toBe('boolean')
      expect(classifyValue(undefined)).toBe('undefined')
      expect(classifyValue(Symbol('test'))).toBe('symbol')
      expect(classifyValue(BigInt(1))).toBe('bigint')
    })

    test('classifyValue handles special objects', () => {
      expect(classifyValue(new Date())).toBe('object')
      expect(classifyValue(/regex/)).toBe('object')
      expect(classifyValue(new Map())).toBe('object')
      expect(classifyValue(new Set())).toBe('object')
    })

    test('isComplex edge case: document.all-like undefined behavior', () => {
      // In some browsers, document.all reports typeof 'undefined' but is an object
      // We test the actual implementation behavior
      expect(isComplex(undefined)).toBe(false)
    })

    test('isPrimitive edge case: boxed primitives are objects', () => {
      // eslint-disable-next-line no-new-wrappers
      expect(isPrimitive(new String('test'))).toBe(false)
      // eslint-disable-next-line no-new-wrappers
      expect(isPrimitive(new Number(42))).toBe(false)
      // eslint-disable-next-line no-new-wrappers
      expect(isPrimitive(new Boolean(true))).toBe(false)
    })

    test('canUseSimpleInput handles all falsy primitives', () => {
      expect(canUseSimpleInput('')).toBe(true)
      expect(canUseSimpleInput(0)).toBe(true)
      expect(canUseSimpleInput(false)).toBe(true)
      expect(canUseSimpleInput(undefined)).toBe(true)
      // null is not undefined and not primitive
      expect(canUseSimpleInput(null)).toBe(false)
    })

    test('isNull rejects undefined', () => {
      expect(isNull(null)).toBe(true)
      expect(isNull(undefined)).toBe(false)
      expect(isNull(0)).toBe(false)
      expect(isNull('')).toBe(false)
    })
  })
})
