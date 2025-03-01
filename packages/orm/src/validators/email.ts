import { isNull, isString, pick } from '@pruvious/utils'
import type { GenericDatabase, GenericValidator } from '../core'
import type { CustomErrorMessage } from './types'
import { resolveCustomErrorMessage } from './utils'

export const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

/**
 * Creates a validator to ensure that the field value is a valid email address.
 *
 * - Validates against [standard email regex pattern](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#basic_validation) used by browsers.
 * - Skips validation when value is `null`.
 * - Throws an error if the validation fails.
 * - The default error message is: 'Invalid email address'.
 * - A custom `errorMessage` can be provided as a parameter.
 *   - The `errorMessage` can be a string or a function that returns a string.
 *   - The function receives an object with `_` and `__` properties to access the translation functions.
 */
export function emailValidator<TDatabase extends GenericDatabase = GenericDatabase>(
  errorMessage?: CustomErrorMessage<TDatabase>,
): GenericValidator {
  return (value, { context }) => {
    if (isNull(value)) {
      return
    }

    if (!isString(value) || !emailRegex.test(value)) {
      const defaultErrorMessage = context.__('pruvious-orm', 'Invalid email address')
      throw new Error(resolveCustomErrorMessage(errorMessage, defaultErrorMessage, pick(context, ['_', '__'])))
    }
  }
}
