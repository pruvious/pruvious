import { isInteger, isNull, pick } from '@pruvious/utils'
import type { GenericDatabase, GenericValidator } from '../core'
import type { CustomErrorMessage } from './types'
import { resolveCustomErrorMessage } from './utils'

/**
 * Creates a validator to ensure that the field value is an integer between 0 and 86399000 (inclusive),
 * representing milliseconds in a day (00:00:00 to 23:59:59).
 *
 * - Skips validation when value is `null`.
 * - Throws an error if the validation fails.
 * - The default error message is: 'Invalid input'.
 * - A custom `errorMessage` can be provided as a parameter.
 *   - The `errorMessage` can be a string or a function that returns a string.
 *   - The function receives an object with `_` and `__` properties to access the translation functions.
 */
export function timeValidator<TDatabase extends GenericDatabase = GenericDatabase>(
  errorMessage?: CustomErrorMessage<TDatabase>,
): GenericValidator {
  return (value, { context }) => {
    if (isNull(value)) {
      return
    }

    if (!isInteger(value) || value < 0 || value > 86399000) {
      const defaultErrorMessage = context.__('pruvious-orm', 'Invalid input')
      throw new Error(resolveCustomErrorMessage(errorMessage, defaultErrorMessage, pick(context, ['_', '__'])))
    }
  }
}
