import type { FieldValidatorContext } from '../fields/field.definition'
import { isBoolean, isNull } from '../utils/common'

/**
 * Validate if the provided input value is a boolean.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * booleanValidator({ value: true }) // OK
 * booleanValidator({ value: null }) // Throws
 * booleanValidator({ value: 1 })    // Throws
 * ```
 */
export function booleanValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isBoolean(context.value)) {
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
 * Validate if the provided input value is a boolean or `null`.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * booleanOrNullValidator({ value: true }) // OK
 * booleanOrNullValidator({ value: null }) // OK
 * booleanOrNullValidator({ value: 1 })    // Throws
 * ```
 */
export function booleanOrNullValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isBoolean(context.value) && !isNull(context.value)) {
    if (context.__ && context.language) {
      throw new Error(
        context.__(context.language, 'pruvious-server', (customErrorMessage as any) ?? 'Invalid input type'),
      )
    } else {
      throw new Error(customErrorMessage ?? 'Invalid input type')
    }
  }
}
