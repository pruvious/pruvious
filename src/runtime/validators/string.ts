import type { FieldValidatorContext } from '../fields/field.definition'
import { isNull } from '../utils/common'
import { isString } from '../utils/string'

/**
 * Validate if the provided input value is an email address.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * emailValidator({ value: 'foo@bar.baz' }) // OK
 * emailValidator({ value: 'foo@bar' })     // Throws
 * emailValidator({ value: null })          // Throws
 * ```
 */
export function emailValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isString(context.value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(context.value)) {
    if (context.__ && context.language) {
      throw new Error(
        context.__(context.language, 'pruvious-server', (customErrorMessage as any) ?? 'Invalid email address'),
      )
    } else {
      throw new Error(customErrorMessage ?? 'Invalid email address')
    }
  }
}

/**
 * Validate if the provided input is a lowercase string.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * lowercaseValidator({ value: 'foo' }) // OK
 * lowercaseValidator({ value: 'Foo' }) // Throws
 * lowercaseValidator({ value: null })  // Throws
 * ```
 */
export function lowercaseValidator(
  context: Pick<FieldValidatorContext, '__' | 'language' | 'value'>,
  customErrorMessage?: string,
) {
  if (!isString(context.value) || context.value.toLowerCase() !== context.value) {
    if (context.__ && context.language) {
      throw new Error(
        context.__(
          context.language,
          'pruvious-server',
          (customErrorMessage as any) ?? 'The value must be a lowercase string',
        ),
      )
    } else {
      throw new Error(
        customErrorMessage ?? context.__(context.language, 'pruvious-server', 'The value must be a lowercase string'),
      )
    }
  }
}

/**
 * Validate if the provided input value is a string.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * stringValidator({ value: '123' }) // OK
 * stringValidator({ value: null })  // Throws
 * stringValidator({ value: 123 })   // Throws
 * ```
 */
export function stringValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isString(context.value)) {
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
 * Validate if the provided input value is a string or `null`.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * stringOrNullValidator({ value: '123' }) // OK
 * stringOrNullValidator({ value: null })  // OK
 * stringOrNullValidator({ value: 123 })   // Throws
 * ```
 */
export function stringOrNullValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isString(context.value) && !isNull(context.value)) {
    if (context.__ && context.language) {
      throw new Error(
        context.__(context.language, 'pruvious-server', (customErrorMessage as any) ?? 'Invalid input type'),
      )
    } else {
      throw new Error(customErrorMessage ?? 'Invalid input type')
    }
  }
}
