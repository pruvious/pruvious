import type { FieldValidatorContext } from '../fields/field.definition'
import { isNull } from '../utils/common'
import { isInteger, isPositiveInteger, isRealNumber } from '../utils/number'

/**
 * Validate if the provided input value is a real number.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * numberValidator({ value: 123 })   // OK
 * numberValidator({ value: 0 })     // OK
 * numberValidator({ value: null })  // Throws
 * numberValidator({ value: '123' }) // Throws
 * numberValidator({ value: NaN })   // Throws
 * ```
 */
export function numberValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isRealNumber(context.value)) {
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
 * Validate if the provided input value is a real number or `null`.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * numberOrNullValidator({ value: 123 })   // OK
 * numberOrNullValidator({ value: 0 })     // OK
 * numberOrNullValidator({ value: null })  // OK
 * numberOrNullValidator({ value: '123' }) // Throws
 * numberOrNullValidator({ value: NaN })   // Throws
 * ```
 */
export function numberOrNullValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isRealNumber(context.value) && !isNull(context.value)) {
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
 * Validate if the provided input value is an integer.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * integerValidator({ value: 123 })  // OK
 * integerValidator({ value: 0 })    // OK
 * integerValidator({ value: null }) // Throws
 * integerValidator({ value: 0.25 }) // Throws
 * integerValidator({ value: NaN })  // Throws
 * ```
 */
export function integerValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isInteger(context.value)) {
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
 * Validate if the provided input value is an integer or `null`.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * integerOrNullValidator({ value: 123 })  // OK
 * integerOrNullValidator({ value: 0 })    // OK
 * integerOrNullValidator({ value: null }) // OK
 * integerOrNullValidator({ value: 0.25 }) // Throws
 * integerOrNullValidator({ value: NaN })  // Throws
 * ```
 */
export function integerOrNullValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isInteger(context.value) && !isNull(context.value)) {
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
 * Validate if the provided input value is a positive integer.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * positiveIntegerValidator({ value: 123 })  // OK
 * positiveIntegerValidator({ value: 0 })    // Throws
 * positiveIntegerValidator({ value: null }) // Throws
 * positiveIntegerValidator({ value: 0.25 }) // Throws
 * positiveIntegerValidator({ value: NaN })  // Throws
 * ```
 */
export function positiveIntegerValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isPositiveInteger(context.value)) {
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
 * Validate if the provided input value is a positive integer or `null`.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * positiveIntegerOrNullValidator({ value: 123 })  // OK
 * positiveIntegerOrNullValidator({ value: null }) // OK
 * positiveIntegerOrNullValidator({ value: 0 })    // Throws
 * positiveIntegerOrNullValidator({ value: 0.25 }) // Throws
 * positiveIntegerOrNullValidator({ value: NaN })  // Throws
 * ```
 */
export function positiveIntegerOrNullValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (!isPositiveInteger(context.value) && !isNull(context.value)) {
    if (context.__ && context.language) {
      throw new Error(
        context.__(context.language, 'pruvious-server', (customErrorMessage as any) ?? 'Invalid input type'),
      )
    } else {
      throw new Error(customErrorMessage ?? 'Invalid input type')
    }
  }
}
