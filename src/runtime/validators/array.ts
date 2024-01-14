import type { FieldValidatorContext } from '../fields/field.definition'
import { isArray } from '../utils/array'
import { isNull } from '../utils/common'

/**
 * Validate if the provided input value is an array.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * arrayValidator({ value: [] })   // OK
 * arrayValidator({ value: null }) // Throws
 * arrayValidator({ value: {} })   // Throws
 * ```
 */
export function arrayValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isArray(context.value)) {
    if (context.__ && context.language) {
      throw new Error(
        context.__(context.language, 'pruvious-server', (customErrorMessage as any) ?? 'Invalid input type'),
      )
    } else {
      throw new Error(customErrorMessage ?? 'Invalid input type')
    }
  }
}

/**
 * Validate if the provided input value is an array or `null`.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * arrayOrNullValidator({ value: [] })   // OK
 * arrayOrNullValidator({ value: null }) // OK
 * arrayOrNullValidator({ value: {} })   // Throws
 * ```
 */
export function arrayOrNullValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isArray(context.value) && !isNull(context.value)) {
    if (context.__ && context.language) {
      throw new Error(
        context.__(context.language, 'pruvious-server', (customErrorMessage as any) ?? 'Invalid input type'),
      )
    } else {
      throw new Error(customErrorMessage ?? 'Invalid input type')
    }
  }
}
