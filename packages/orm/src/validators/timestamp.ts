import { isInteger, isNull, pick } from '@pruvious/utils'
import type { GenericDatabase, GenericValidator } from '../core'
import type { CustomErrorMessage } from './types'
import { resolveCustomErrorMessage } from './utils'

/**
 * Creates a validator to ensure that the field value is a valid JavaScript timestamp.
 *
 * - Skips validation when value is `null`.
 * - Throws an error if the validation fails.
 * - The default error message is: 'Invalid timestamp'.
 * - A custom `errorMessage` can be provided as a parameter.
 *   - The `errorMessage` can be a string or a function that returns a string.
 *   - The function receives an object with `_` and `__` properties to access the translation functions.
 */
export function timestampValidator<TDatabase extends GenericDatabase = GenericDatabase>(
  errorMessage?: CustomErrorMessage<TDatabase>,
): GenericValidator {
  return (value, { context }) => {
    if (isNull(value)) {
      return
    }

    if (!isInteger(value) || value < -8640000000000000 || value > 8640000000000000) {
      const defaultErrorMessage = context.__('pruvious-orm', 'Invalid timestamp')
      throw new Error(resolveCustomErrorMessage(errorMessage, defaultErrorMessage, pick(context, ['_', '__'])))
    }
  }
}
