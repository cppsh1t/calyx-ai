/** @jsxImportSource react */

import { SchemaInfoPopover } from '@/components/SchemaInfoPopover.tsx'
import { Input } from '@/components/ui/input.tsx'
import { isBoolean, isNumber, isPrimitive, isString } from '@/utils/classify.ts'
import { fromOption, isSome, none, some } from '@/utils/option.ts'
import type { NodeParameter, Option } from 'calyx-flow/types'
import type { ChangeEvent, ReactNode } from 'react'

function ClearInputIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

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

  const renderClearableInput = (input: ReactNode) => {
    return (
      <div className="relative min-w-0 w-full max-w-full overflow-hidden">
        {input}
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1 top-1/2 inline-flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border border-transparent bg-transparent text-slate-400/90 transition hover:border-slate-200/80 hover:bg-slate-100/80 hover:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={`Clear ${parameter.name}`}
            title="Clear value"
            data-action="clear"
          >
            <ClearInputIcon />
          </button>
        )}
      </div>
    )
  }

  // Render appropriate control based on detected primitive type
  const renderControl = () => {
    switch (primitiveType) {
      case 'string':
        return renderClearableInput(
          <Input
            type="text"
            value={isString(currentValue) ? currentValue : ''}
            onChange={handleStringChange}
            placeholder={`Enter ${parameter.name}...`}
            aria-label={parameter.name}
            title={parameter.description}
            data-param-name={parameter.name}
            data-param-type="string"
            className="pr-6"
          />
        )

      case 'number':
        return renderClearableInput(
          <Input
            type="number"
            value={isNumber(currentValue) ? currentValue : ''}
            onChange={handleNumberChange}
            placeholder={`Enter ${parameter.name}...`}
            aria-label={parameter.name}
            title={parameter.description}
            data-param-name={parameter.name}
            data-param-type="number"
            className="pr-6"
          />
        )

      case 'boolean':
        return (
          <label
            className="inline-flex h-6 min-w-0 w-full max-w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700 shadow-sm"
            data-param-name={parameter.name}
            data-param-type="boolean"
          >
            <input
              type="checkbox"
              checked={isBoolean(currentValue) ? currentValue : false}
              onChange={handleBooleanChange}
              aria-label={parameter.name}
              title={parameter.description}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900"
            />
            <span>Enabled</span>
            {hasValue && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  handleClear()
                }}
                className="ml-auto inline-flex h-4 w-4 items-center justify-center rounded-full border border-transparent bg-transparent text-slate-400/90 transition hover:border-slate-200/80 hover:bg-slate-100/80 hover:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={`Clear ${parameter.name}`}
                title="Clear value"
                data-action="clear"
              >
                <ClearInputIcon />
              </button>
            )}
          </label>
        )

      default:
        // Fallback to string input for unknown types
        return renderClearableInput(
          <Input
            type="text"
            value={isPrimitive(currentValue) ? String(currentValue) : ''}
            onChange={handleStringChange}
            placeholder={`Enter ${parameter.name}...`}
            aria-label={parameter.name}
            title={parameter.description}
            data-param-name={parameter.name}
            data-param-type="string"
            className="pr-6"
          />
        )
    }
  }

  return (
    <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-2" data-has-value={hasValue} data-param-name={parameter.name}>
      <div className="mb-1.5 inline-flex items-center gap-1.5">
        <span className="text-xs font-medium text-slate-800">{parameter.name}</span>
        <SchemaInfoPopover title={parameter.name} schema={parameter.schema} description={parameter.description} />
      </div>
      <div className="min-w-0 w-full max-w-full">{renderControl()}</div>
    </div>
  )
}

export default PrimitiveParameterControl
