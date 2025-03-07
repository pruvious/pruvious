import { isArray, isEmpty, isNull, isObject, isString, pick } from '@pruvious/utils'
import type { GenericDatabase, GenericValidator } from '../core'
import type { CustomErrorMessage } from './types'
import { resolveCustomErrorMessage } from './utils'

/**
 * Creates a validator to ensure that the field value is not empty.
 *
 * - Throws an error if the field value is:
 *   - `null`
 *   - an empty string
 *   - an empty array
 *   - an empty object
 * - The default error message is: 'This field must have a value that is not empty'.
 * - A custom `errorMessage` can be provided as a parameter.
 *   - The `errorMessage` can be a string or a function that returns a string.
 *   - The function receives an object with `_` and `__` properties to access the translation functions.
 */
export function nonEmptyValidator<TDatabase extends GenericDatabase = GenericDatabase>(
  errorMessage?: CustomErrorMessage<TDatabase>,
): GenericValidator {
  return (value, { context }) => {
    if (isNull(value) || ((isString(value) || isArray(value) || isObject(value)) && isEmpty(value))) {
      const defaultErrorMessage = context.__('pruvious-orm', 'This field must have a value that is not empty')
      throw new Error(resolveCustomErrorMessage(errorMessage, defaultErrorMessage, pick(context, ['_', '__'])))
    }
  }
}
