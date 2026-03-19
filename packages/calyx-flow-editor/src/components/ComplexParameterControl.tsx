/** @jsxImportSource react */

import { SchemaInfoPopover } from '@/components/SchemaInfoPopover.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { isComplex } from '@/utils/classify.ts'
import { fromOption, isSome, none, some } from '@/utils/option.ts'
import { isValidationParseError, isValidationSchemaError, isValidationSuccess, validateComplexParameterJson } from '@/utils/validation.ts'
import type { NodeParameter, Option } from 'calyx-flow/types'
import { useCallback, useMemo, useState } from 'react'

/**
 * Props for complex parameter control component.
 *
 * Contract:
 * - `parameter` contains the current value as an Option
 * - `onChange` is called with the new Option value only on confirm
 * - Cancel action closes modal without calling onChange
 * - Draft state is isolated per parameter (editing one does not mutate others)
 */
export type ComplexParameterControlProps = {
  /** The node parameter to edit */
  parameter: NodeParameter
  /** Callback invoked when the parameter value is confirmed */
  onChange: (value: Option<unknown>) => void
}

/**
 * Format a value as a compact JSON preview for the textarea.
 * Limits output to avoid overwhelming the UI with large objects.
 *
 * @param value - The value to format
 * @param maxLength - Maximum length of the preview (default: 100)
 * @returns Formatted JSON string, possibly truncated
 */
export function formatJsonPreview(value: unknown, maxLength = 100): string {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'undefined'
  }

  try {
    const json = JSON.stringify(value)
    if (json.length <= maxLength) {
      return json
    }
    return `${json.slice(0, maxLength)}...`
  } catch {
    return '[Invalid JSON]'
  }
}

/**
 * Format a value as pretty-printed JSON for editing in the modal.
 *
 * @param value - The value to format
 * @returns Pretty-printed JSON string (2-space indentation)
 */
export function formatJsonForEditing(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return ''
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

/**
 * Complex Parameter Control Component.
 *
 * Renders a textarea preview for complex parameters (objects, arrays, null).
 * Clicking the preview opens a modal with an editable JSON text area.
 *
 * Features:
 * - Textarea preview showing compact JSON representation
 * - Modal with full JSON editing capability
 * - Explicit confirm action: validates and commits the value
 * - Explicit cancel action: closes modal without committing
 * - Draft state is isolated per parameter (editing one does not mutate others)
 * - No assignment on draft typing (only on confirm)
 *
 * @example
 * ```tsx
 * <ComplexParameterControl
 *   parameter={{
 *     name: 'config',
 *     description: 'Configuration object',
 *     schema: z.object({}),
 *     value: { type: 'Some', value: { key: 'value' } }
 *   }}
 *   onChange={(newValue) => updateParameter(nodeId, 'config', newValue)}
 * />
 * ```
 */
export function ComplexParameterControl({ parameter, onChange }: ComplexParameterControlProps) {
  // Modal visibility state
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Extract current value from Option
  const currentValue = fromOption(parameter.value)
  const hasValue = isSome(parameter.value)

  // Determine if this is actually a complex parameter
  const isComplexValue = hasValue && currentValue !== undefined && isComplex(currentValue)

  // Generate preview text
  const previewText = useMemo(() => {
    if (!hasValue || currentValue === undefined) {
      return '[No value]'
    }
    return formatJsonPreview(currentValue)
  }, [currentValue, hasValue])

  // Modal draft state - isolated per parameter
  const [draftText, setDraftText] = useState('')

  // Validation error state - exposed for testing and UI display
  const [validationError, setValidationError] = useState<
    { type: 'parse'; message: string } | { type: 'schema'; message: string; issues: Array<{ path: (string | number)[]; message: string }> } | null
  >(null)

  // Open modal and initialize draft with current value
  const handleOpenModal = useCallback(() => {
    const initialDraft = hasValue ? formatJsonForEditing(currentValue) : ''
    setDraftText(initialDraft)
    setValidationError(null)
    setIsModalOpen(true)
  }, [currentValue, hasValue])

  // Close modal without committing (cancel)
  const handleCancel = useCallback(() => {
    setIsModalOpen(false)
    // Clear draft and validation error to ensure fresh state on next open
    setDraftText('')
    setValidationError(null)
  }, [])

  // Confirm and commit the value with validation gating
  const handleConfirm = useCallback(() => {
    const trimmedDraft = draftText.trim()

    if (trimmedDraft === '') {
      // Empty draft = clear value (None)
      onChange(none())
      setIsModalOpen(false)
      setDraftText('')
      setValidationError(null)
      return
    }

    // Validate using the parameter's schema
    const result = validateComplexParameterJson(trimmedDraft, parameter.schema)

    if (isValidationSuccess(result)) {
      // Validation passed - commit the value
      onChange(some(result.value))
      setIsModalOpen(false)
      setDraftText('')
      setValidationError(null)
    } else if (isValidationParseError(result)) {
      // Parse error - keep modal open, show error
      setValidationError({
        type: 'parse',
        message: result.message,
      })
    } else if (isValidationSchemaError(result)) {
      // Schema error - keep modal open, show error with issues
      setValidationError({
        type: 'schema',
        message: result.message,
        issues: result.issues,
      })
    }
  }, [draftText, onChange, parameter.schema])

  // Handle draft text changes (isolated, no assignment)
  // Clear validation error when user starts typing again
  const handleDraftChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftText(e.target.value)
    // Clear validation error when user starts typing again
    setValidationError(null)
  }, [])

  return (
    <div
      className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-2.5"
      data-has-value={hasValue}
      data-is-complex={isComplexValue}
      data-param-name={parameter.name}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-800">{parameter.name}</span>
          <SchemaInfoPopover title={parameter.name} schema={parameter.schema} description={parameter.description} />
        </div>
        {isComplexValue && (
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {Array.isArray(currentValue) ? 'array' : 'object'}
          </span>
        )}
      </div>

      {/* Textarea preview - clickable to open modal */}
      <div>
        <Textarea
          className="min-h-14 w-full resize-none rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/30"
          value={previewText}
          readOnly
          onClick={handleOpenModal}
          aria-label={`${parameter.name} - click to edit`}
          title={parameter.description || `Click to edit ${parameter.name}`}
          data-param-name={parameter.name}
          data-action="open-modal"
          rows={2}
        />
      </div>

      {parameter.description && <div className="mt-2 text-[11px] leading-relaxed text-slate-500">{parameter.description}</div>}

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[1px]"
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${parameter.name}`}
          data-modal-open="true"
        >
          <div
            className="w-full max-w-xl rounded-xl border border-slate-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Edit {parameter.name}</h3>
              <Button
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-sm text-slate-500 transition hover:text-slate-900"
                onClick={handleCancel}
                aria-label="Cancel"
                data-action="cancel"
                variant="outline"
                size="icon"
              >
                x
              </Button>
            </div>

            <div className="space-y-3 px-4 py-3">
              {parameter.description && <p className="text-xs text-slate-500">{parameter.description}</p>}
              <Textarea
                className="min-h-56 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs leading-relaxed text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-400/30"
                value={draftText}
                onChange={handleDraftChange}
                placeholder="Enter JSON value..."
                aria-label="JSON editor"
                data-testid="json-editor"
                rows={10}
                autoFocus
                aria-invalid={validationError !== null}
                aria-errormessage={validationError ? 'validation-error' : undefined}
              />

              {/* Validation error display */}
              {validationError && (
                <div
                  className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                  data-testid="validation-error"
                  data-error-type={validationError.type}
                  role="alert"
                  id="validation-error"
                >
                  <div>{validationError.message}</div>
                  {validationError.type === 'schema' && validationError.issues.length > 0 && (
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {validationError.issues.map((issue, index) => (
                        <li key={index} data-issue-path={issue.path.join('.')}>
                          {issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <Button
                className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:text-slate-900"
                onClick={handleCancel}
                data-action="cancel"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="inline-flex h-8 items-center rounded-md border border-slate-900 bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-800"
                onClick={handleConfirm}
                data-action="confirm"
                variant="default"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ComplexParameterControl
