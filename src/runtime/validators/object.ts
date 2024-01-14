import type { FieldValidatorContext } from '../fields/field.definition'
import { isNull } from '../utils/common'
import { isObject } from '../utils/object'

/**
 * Validate if the provided input value is a normal object.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * objectValidator({ value: true }) // OK
 * objectValidator({ value: null }) // Throws
 * objectValidator({ value: 1 })    // Throws
 * ```
 */
export function objectValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isObject(context.value)) {
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
 * Validate if the provided input value is a normal object or `null`.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * objectOrNullValidator({ value: true }) // OK
 * objectOrNullValidator({ value: null }) // OK
 * objectOrNullValidator({ value: 1 })    // Throws
 * ```
 */
export function objectOrNullValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isObject(context.value) && !isNull(context.value)) {
    if (context.__ && context.language) {
      throw new Error(
        context.__(context.language, 'pruvious-server', (customErrorMessage as any) ?? 'Invalid input type'),
      )
    } else {
      throw new Error(customErrorMessage ?? 'Invalid input type')
    }
  }
}
