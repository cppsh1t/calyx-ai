/** @jsxImportSource react */

import { isBoolean, isNumber, isPrimitive, isString } from '@/utils/classify.ts'
import { fromOption, isSome, none, some } from '@/utils/option.ts'
import type { NodeParameter, Option } from 'calyx-flow/types'
import type { ChangeEvent } from 'react'

/**
 * Props for primitive parameter control component.
 *
 * Contract:
 * - `parameter` contains the current value as an Option
 * - `onChange` is called with the new Option value on every valid change
 * - Clear action explicitly calls onChange with Option.None
 */
export type PrimitiveParameterControlProps = {
  /** The node parameter to edit */
  parameter: NodeParameter
  /** Callback invoked when the parameter value changes */
  onChange: (value: Option<unknown>) => void
}

/**
 * Determine the primitive input type based on the current value.
 *
 * Returns 'string' as default for undefined/None values to provide
 * a sensible starting point for editing.
 *
 * @param value - The current value (may be undefined)
 * @returns The detected primitive type: 'string' | 'number' | 'boolean'
 */
export function detectPrimitiveType(value: unknown): 'string' | 'number' | 'boolean' {
  if (isString(value)) return 'string'
  if (isNumber(value)) return 'number'
  if (isBoolean(value)) return 'boolean'
  return 'string' // Default to string for undefined/None
}

/**
 * Guard against invalid number assignments.
 *
 * Returns true if the value is a valid number (not NaN, not Infinity, not -Infinity).
 * This prevents NaN from being committed to the parameter state.
 *
 * @param value - The value to check
 * @returns true if the value is a valid finite number
 */
export function isValidNumber(value: number): boolean {
  return !Number.isNaN(value) && Number.isFinite(value)
}

/**
 * Create a handler for string input changes.
 * Writes Option.Some with the new string value.
 *
 * @param onChange - Callback to invoke with the new Option value
 * @returns Event handler for string input changes
 */
export function createStringChangeHandler(onChange: (value: Option<unknown>) => void): (e: ChangeEvent<HTMLInputElement>) => void {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(some(newValue))
  }
}

/**
 * Create a handler for number input changes.
 * Guards against NaN and Infinity - only commits valid finite numbers.
 *
 * @param onChange - Callback to invoke with the new Option value
 * @returns Event handler for number input changes
 */
export function createNumberChangeHandler(onChange: (value: Option<unknown>) => void): (e: ChangeEvent<HTMLInputElement>) => void {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Handle empty input - treat as clear (None)
    if (inputValue === '') {
      onChange(none())
      return
    }

    const numValue = Number(inputValue)

    // Guard: block NaN and non-finite values
    if (!isValidNumber(numValue)) {
      // Invalid number - don't commit, keep current state
      return
    }

    onChange(some(numValue))
  }
}

/**
 * Create a handler for boolean input changes.
 * Writes Option.Some with the new boolean value.
 *
 * @param onChange - Callback to invoke with the new Option value
 * @returns Event handler for boolean input changes
 */
export function createBooleanChangeHandler(onChange: (value: Option<unknown>) => void): (e: ChangeEvent<HTMLInputElement>) => void {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked
    onChange(some(newValue))
  }
}

/**
 * Create a handler for clear action.
 * Explicitly sets Option.None to clear the parameter value.
 *
 * @param onChange - Callback to invoke with Option.None
 * @returns Event handler for clear action
 */
export function createClearHandler(onChange: (value: Option<unknown>) => void): () => void {
  return () => {
    onChange(none())
  }
}

/**
 * Primitive Parameter Control Component.
 *
 * Renders inline controls for string, number, and boolean parameters.
 *
 * Features:
 * - String: text input
 * - Number: number input with NaN/Infinity guard
 * - Boolean: checkbox
 * - Clear action: sets Option.None
 * - All edits write Option.Some(value) to the targeted parameter only
 *
 * @example
 * ```tsx
 * <PrimitiveParameterControl
 *   parameter={{
 *     name: 'count',
 *     description: 'Item count',
 *     schema: z.number(),
 *     value: { type: 'Some', value: 42 }
 *   }}
 *   onChange={(newValue) => updateParameter(nodeId, 'count', newValue)}
 * />
 * ```
 */
export function PrimitiveParameterControl({ parameter, onChange }: PrimitiveParameterControlProps) {
  // Extract current value from Option
  const currentValue = fromOption(parameter.value)
  const hasValue = isSome(parameter.value)

  // Detect the primitive type for rendering the appropriate control
  const primitiveType = detectPrimitiveType(currentValue)

  // Create handlers using the exported factory functions
  const handleStringChange = createStringChangeHandler(onChange)
  const handleNumberChange = createNumberChangeHandler(onChange)
  const handleBooleanChange = createBooleanChangeHandler(onChange)
  const handleClear = createClearHandler(onChange)

  // Render appropriate control based on detected primitive type
  const renderControl = () => {
    switch (primitiveType) {
      case 'string':
        return (
          <input
            type="text"
            value={isString(currentValue) ? currentValue : ''}
            onChange={handleStringChange}
            placeholder={`Enter ${parameter.name}...`}
            aria-label={parameter.name}
            title={parameter.description}
            className="primitive-param-input primitive-param-input--string"
            data-param-name={parameter.name}
            data-param-type="string"
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={isNumber(currentValue) ? currentValue : ''}
            onChange={handleNumberChange}
            placeholder={`Enter ${parameter.name}...`}
            aria-label={parameter.name}
            title={parameter.description}
            className="primitive-param-input primitive-param-input--number"
            data-param-name={parameter.name}
            data-param-type="number"
          />
        )

      case 'boolean':
        return (
          <label className="primitive-param-boolean-label" data-param-name={parameter.name} data-param-type="boolean">
            <input
              type="checkbox"
              checked={isBoolean(currentValue) ? currentValue : false}
              onChange={handleBooleanChange}
              aria-label={parameter.name}
              title={parameter.description}
              className="primitive-param-input primitive-param-input--boolean"
            />
            <span className="primitive-param-boolean-text">{parameter.name}</span>
          </label>
        )

      default:
        // Fallback to string input for unknown types
        return (
          <input
            type="text"
            value={isPrimitive(currentValue) ? String(currentValue) : ''}
            onChange={handleStringChange}
            placeholder={`Enter ${parameter.name}...`}
            aria-label={parameter.name}
            title={parameter.description}
            className="primitive-param-input primitive-param-input--string"
            data-param-name={parameter.name}
            data-param-type="string"
          />
        )
    }
  }

  return (
    <div className="primitive-parameter-control" data-has-value={hasValue} data-param-name={parameter.name}>
      <div className="primitive-parameter-header">
        <span className="primitive-parameter-name">{parameter.name}</span>
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="primitive-parameter-clear"
            aria-label={`Clear ${parameter.name}`}
            title="Clear value"
            data-action="clear"
          >
            ×
          </button>
        )}
      </div>
      <div className="primitive-parameter-input-wrapper">{renderControl()}</div>
      {parameter.description && <div className="primitive-parameter-description">{parameter.description}</div>}
    </div>
  )
}

export default PrimitiveParameterControl
