import { isNull, pick, withoutTrailingSlash } from '@pruvious/utils'
import type { GenericDatabase, GenericValidator } from '../core'
import type { CustomErrorMessage } from './types'
import { resolveCustomErrorMessage } from './utils'

/**
 * Creates a validator to ensure that the field value is a valid URL.
 *
 * - Uses the native `URL` constructor for validation.
 * - Skips validation when value is `null`.
 * - Throws an error if the validation fails.
 * - The default error message is: 'Invalid URL'.
 * - A custom `errorMessage` can be provided as a parameter.
 *   - The `errorMessage` can be a string or a function that returns a string.
 *   - The function receives an object with `_` and `__` properties to access the translation functions.
 */
export function urlValidator<TDatabase extends GenericDatabase = GenericDatabase>(
  errorMessage?: CustomErrorMessage<TDatabase>,
): GenericValidator {
  return (value, { context }) => {
    if (isNull(value)) {
      return
    }

    try {
      const url = new URL(value)
      if (
        (url.href.startsWith('http://') || url.href.startsWith('https://')) &&
        withoutTrailingSlash(url.href) === withoutTrailingSlash(value) &&
        !url.pathname.match(/\/{2,}/)
      ) {
        return
      }
    } catch {}

    const defaultErrorMessage = context.__('pruvious-orm', 'Invalid URL')
    throw new Error(resolveCustomErrorMessage(errorMessage, defaultErrorMessage, pick(context, ['_', '__'])))
  }
}
