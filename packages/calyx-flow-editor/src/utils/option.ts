import type { Option } from 'calyx-flow/types'

/**
 * Option conversion helpers for assignment/clear semantics.
 *
 * These utilities provide a functional interface for working with Option types
 * from calyx-flow, supporting:
 * - clear/unset -> { type: 'None' }
 * - valid assignment -> { type: 'Some', value }
 *
 * Compatible with calyx-flow's Option<T> type:
 *   type Option<T> = { type: 'Some'; value: T } | { type: 'None' }
 */

/**
 * Create a 'Some' option with the given value.
 *
 * @param value - The value to wrap (must not be undefined for valid assignment)
 * @returns Option with type 'Some' containing the value
 *
 * @example
 * some('hello') // { type: 'Some', value: 'hello' }
 * some(42)      // { type: 'Some', value: 42 }
 */
export function some<T>(value: T): Option<T> {
  return { type: 'Some', value }
}

/**
 * Create a 'None' option (represents clear/unset state).
 *
 * @returns Option with type 'None'
 *
 * @example
 * none() // { type: 'None' }
 */
export function none<T>(): Option<T> {
  return { type: 'None' }
}

/**
 * Convert a value to an Option.
 * - undefined -> { type: 'None' }
 * - any other value -> { type: 'Some', value }
 *
 * This is the primary entry point for form/field values that may be empty.
 *
 * @param value - Value to convert (may be undefined)
 * @returns Option representing the value state
 *
 * @example
 * toOption(undefined)     // { type: 'None' }
 * toOption('hello')       // { type: 'Some', value: 'hello' }
 * toOption(0)             // { type: 'Some', value: 0 }
 * toOption('')            // { type: 'Some', value: '' }
 */
export function toOption<T>(value: T | undefined): Option<T> {
  if (value === undefined) {
    return none<T>()
  }
  return some(value)
}

/**
 * Convert an Option back to a plain value.
 * - { type: 'None' } -> undefined
 * - { type: 'Some', value } -> value
 *
 * @param option - The Option to unwrap
 * @returns The contained value or undefined
 *
 * @example
 * fromOption({ type: 'None' })           // undefined
 * fromOption({ type: 'Some', value: 42 }) // 42
 */
export function fromOption<T>(option: Option<T>): T | undefined {
  if (option.type === 'None') {
    return undefined
  }
  return option.value
}

/**
 * Check if an Option is 'Some' (has a value).
 *
 * @param option - The Option to check
 * @returns true if the Option contains a value
 *
 * @example
 * isSome({ type: 'None' })           // false
 * isSome({ type: 'Some', value: 42 }) // true
 */
export function isSome<T>(option: Option<T>): option is { type: 'Some'; value: T } {
  return option.type === 'Some'
}

/**
 * Check if an Option is 'None' (clear/unset).
 *
 * @param option - The Option to check
 * @returns true if the Option is empty
 *
 * @example
 * isNone({ type: 'None' })           // true
 * isNone({ type: 'Some', value: 42 }) // false
 */
export function isNone<T>(option: Option<T>): option is { type: 'None' } {
  return option.type === 'None'
}

/**
 * Map a function over an Option value.
 * - { type: 'None' } -> { type: 'None' }
 * - { type: 'Some', value } -> { type: 'Some', value: fn(value) }
 *
 * @param option - The Option to map over
 * @param fn - Function to apply to the contained value
 * @returns New Option with transformed value, or None if input was None
 *
 * @example
 * map({ type: 'Some', value: 5 }, x => x * 2)  // { type: 'Some', value: 10 }
 * map({ type: 'None' }, x => x * 2)            // { type: 'None' }
 */
export function map<T, U>(option: Option<T>, fn: (value: T) => U): Option<U> {
  if (option.type === 'None') {
    return none<U>()
  }
  return some(fn(option.value))
}

/**
 * Get the value from an Option, or return a default if None.
 *
 * @param option - The Option to unwrap
 * @param defaultValue - Value to return if Option is None
 * @returns The contained value or the default
 *
 * @example
 * getOrElse({ type: 'None' }, 'default')           // 'default'
 * getOrElse({ type: 'Some', value: 'hello' }, 'default') // 'hello'
 */
export function getOrElse<T>(option: Option<T>, defaultValue: T): T {
  if (option.type === 'None') {
    return defaultValue
  }
  return option.value
}
