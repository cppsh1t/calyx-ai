/**
 * Primitive vs Complex value classification utilities.
 *
 * Provides deterministic type classification for form handling and
 * input validation in the flow editor.
 *
 * Classification:
 * - Primitive: string | number | boolean
 * - Complex: object | array | null
 */

/**
 * Type guard for primitive values.
 * Primitive types: string, number, boolean
 *
 * @param value - Value to check
 * @returns true if value is a primitive (string, number, or boolean)
 *
 * @example
 * isPrimitive('hello')  // true
 * isPrimitive(42)       // true
 * isPrimitive(true)     // true
 * isPrimitive(null)     // false
 * isPrimitive([])       // false
 * isPrimitive({})       // false
 */
export function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

/**
 * Type guard for complex values (non-primitives).
 * Complex types: object (including arrays) | null
 *
 * @param value - Value to check
 * @returns true if value is complex (object, array, or null)
 *
 * @example
 * isComplex(null)       // true
 * isComplex([])         // true
 * isComplex({})         // true
 * isComplex('hello')    // false
 * isComplex(42)         // false
 * isComplex(true)       // false
 */
export function isComplex(value: unknown): value is object | null {
  return value === null || (typeof value === 'object' && value !== undefined)
}

/**
 * Type guard for string values.
 *
 * @param value - Value to check
 * @returns true if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Type guard for number values.
 *
 * @param value - Value to check
 * @returns true if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

/**
 * Type guard for boolean values.
 *
 * @param value - Value to check
 * @returns true if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Type guard for null values.
 *
 * @param value - Value to check
 * @returns true if value is null
 */
export function isNull(value: unknown): value is null {
  return value === null
}

/**
 * Type guard for array values.
 *
 * @param value - Value to check
 * @returns true if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Type guard for plain object values (excluding arrays and null).
 *
 * @param value - Value to check
 * @returns true if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Get the classification type of a value.
 *
 * @param value - Value to classify
 * @returns String classification: 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object' | 'undefined' | 'function' | 'symbol' | 'bigint'
 *
 * @example
 * classifyValue('hello')  // 'string'
 * classifyValue(42)       // 'number'
 * classifyValue(null)     // 'null'
 * classifyValue([])       // 'array'
 * classifyValue({})       // 'object'
 * classifyValue(undefined) // 'undefined'
 */
export function classifyValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  return typeof value
}

/**
 * Determine if a value can be edited with a simple input field.
 * Returns true for primitives and undefined (treat undefined as empty field).
 *
 * @param value - Value to check
 * @returns true if value is suitable for simple input editing
 *
 * @example
 * canUseSimpleInput('hello')    // true
 * canUseSimpleInput(42)         // true
 * canUseSimpleInput(true)       // true
 * canUseSimpleInput(undefined)  // true
 * canUseSimpleInput(null)       // false
 * canUseSimpleInput([])         // false
 * canUseSimpleInput({})         // false
 */
export function canUseSimpleInput(value: unknown): boolean {
  return isPrimitive(value) || value === undefined
}

/**
 * Get a user-friendly display name for a value's type.
 *
 * @param value - Value to get type name for
 * @returns Human-readable type name
 *
 * @example
 * getTypeDisplayName('hello')   // 'string'
 * getTypeDisplayName([])        // 'array'
 * getTypeDisplayName(null)      // 'null'
 */
export function getTypeDisplayName(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  return typeof value
}
