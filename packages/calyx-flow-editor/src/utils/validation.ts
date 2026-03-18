import type { ZodType } from 'zod'

/**
 * Complex parameter JSON validation result types.
 *
 * Discriminated union representing the three possible validation outcomes:
 * - Parse error: JSON syntax is invalid
 * - Schema error: JSON is valid but doesn't match the schema
 * - Success: JSON is valid and matches the schema
 *
 * This design ensures exhaustive handling at the type level and provides
 * structured error metadata for UI display.
 */

/**
 * Parse error result.
 * Returned when JSON.parse fails due to malformed syntax.
 */
export type ValidationParseError = {
  success: false
  errorType: 'parse'
  /** Human-readable parse error message */
  message: string
  /** Original error from JSON.parse for debugging */
  cause: Error
}

/**
 * Schema validation error result.
 * Returned when parsed JSON fails Zod schema validation.
 */
export type ValidationSchemaError = {
  success: false
  errorType: 'schema'
  /** Human-readable summary of validation failures */
  message: string
  /** Detailed Zod error issues for field-level error display */
  issues: Array<{
    path: (string | number)[]
    message: string
  }>
  /** Original Zod error for debugging */
  cause: Error
}

/**
 * Success result.
 * Returned when JSON parses successfully and passes schema validation.
 * The value is ready to be wrapped in Option.Some.
 */
export type ValidationSuccess<T> = {
  success: true
  /** The validated and parsed value */
  value: T
}

/**
 * Union type for all validation outcomes.
 * Use discriminant property `success` to narrow the type.
 */
export type ValidationResult<T> = ValidationParseError | ValidationSchemaError | ValidationSuccess<T>

/**
 * Validate complex parameter JSON text against a Zod schema.
 *
 * This utility provides a pure, side-effect-free validation pipeline:
 * 1. Parse the JSON text
 * 2. If parse succeeds, validate against the provided Zod schema
 * 3. Return structured result with appropriate error metadata
 *
 * The returned value on success is ready to be wrapped in Option.Some
 * for assignment to NodeParameter.value.
 *
 * @param text - The JSON text to validate (typically from a textarea/modal)
 * @param schema - Zod schema from NodeParameter.schema to validate against
 * @returns ValidationResult with success flag and appropriate payload or error details
 *
 * @example
 * ```ts
 * const schema = z.object({ name: z.string(), count: z.number() })
 *
 * // Success case
 * const result1 = validateComplexParameterJson('{"name": "test", "count": 5}', schema)
 * if (result1.success) {
 *   // result1.value is { name: 'test', count: 5 }
 *   const option = some(result1.value)
 * }
 *
 * // Parse error case
 * const result2 = validateComplexParameterJson('not valid json', schema)
 * if (!result2.success && result2.errorType === 'parse') {
 *   // result2.message contains parse error details
 * }
 *
 * // Schema error case
 * const result3 = validateComplexParameterJson('{"name": 123}', schema)
 * if (!result3.success && result3.errorType === 'schema') {
 *   // result3.issues contains field-level validation errors
 * }
 * ```
 */
export function validateComplexParameterJson<T>(text: string, schema: ZodType<T>): ValidationResult<T> {
  // Step 1: Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (parseError) {
    const error = parseError instanceof Error ? parseError : new Error(String(parseError))
    return {
      success: false,
      errorType: 'parse',
      message: `Invalid JSON: ${error.message}`,
      cause: error,
    }
  }

  // Step 2: Validate against schema
  const result = schema.safeParse(parsed)

  if (!result.success) {
    const zodError = result.error
    return {
      success: false,
      errorType: 'schema',
      message: `Validation failed: ${zodError.issues.map((e) => `${e.path.join('.') || 'root'}: ${e.message}`).join(', ')}`,
      issues: zodError.issues.map((e) => ({
        path: e.path.filter((p): p is string | number => typeof p === 'string' || typeof p === 'number'),
        message: e.message,
      })),
      cause: zodError,
    }
  }

  // Step 3: Return success with validated value
  return {
    success: true,
    value: result.data,
  }
}

/**
 * Type guard to check if validation result is a success.
 *
 * @param result - The validation result to check
 * @returns true if the result is a success
 *
 * @example
 * ```ts
 * const result = validateComplexParameterJson(json, schema)
 * if (isValidationSuccess(result)) {
 *   // TypeScript knows result.value exists here
 *   const option = some(result.value)
 * }
 * ```
 */
export function isValidationSuccess<T>(result: ValidationResult<T>): result is ValidationSuccess<T> {
  return result.success === true
}

/**
 * Type guard to check if validation result is a parse error.
 *
 * @param result - The validation result to check
 * @returns true if the result is a parse error
 *
 * @example
 * ```ts
 * const result = validateComplexParameterJson(json, schema)
 * if (isValidationParseError(result)) {
 *   // TypeScript knows result.errorType === 'parse' here
 *   showError(result.message)
 * }
 * ```
 */
export function isValidationParseError<T>(result: ValidationResult<T>): result is ValidationParseError {
  return result.success === false && result.errorType === 'parse'
}

/**
 * Type guard to check if validation result is a schema error.
 *
 * @param result - The validation result to check
 * @returns true if the result is a schema error
 *
 * @example
 * ```ts
 * const result = validateComplexParameterJson(json, schema)
 * if (isValidationSchemaError(result)) {
 *   // TypeScript knows result.issues exists here
 *   showFieldErrors(result.issues)
 * }
 * ```
 */
export function isValidationSchemaError<T>(result: ValidationResult<T>): result is ValidationSchemaError {
  return result.success === false && result.errorType === 'schema'
}
