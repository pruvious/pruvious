import type { FieldValidatorContext } from '../fields/field.definition'
import { isUndefined } from '../utils/common'

/**
 * Validate if the provided input is defined.
 *
 * @throws Throws an error if the validation fails.
 *
 * @example
 * ```typescript
 * presentValidator({ value: 'foo' })     // OK
 * presentValidator({ value: null })      // OK
 * presentValidator({ value: undefined }) // Throws
 * ```
 */
export function presentValidator(
  context: { __?: FieldValidatorContext['__']; language?: FieldValidatorContext['language']; value: any },
  customErrorMessage?: string,
) {
  if (isUndefined(context.value)) {
    if (context.__ && context.language) {
      throw new Error(
        context.__(context.language, 'pruvious-server', (customErrorMessage as any) ?? 'This field must be present'),
      )
    } else {
      throw new Error(customErrorMessage ?? 'This field must be present')
    }
  }
}
