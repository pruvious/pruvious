import { isNull, isString, pick } from '@pruvious/utils'
import type { GenericDatabase, GenericValidator } from '../core'
import type { CustomErrorMessage } from './types'
import { resolveCustomErrorMessage } from './utils'

/**
 * Creates a validator to ensure that the field value is a valid upload path.
 * The path must be an absolute path starting with a `/`.
 * The directory names can only contain lowercase letters, numbers, and hyphens.
 * The file name can contain lowercase letters, numbers, hyphens, and periods.
 *
 * - Skips validation when value is `null`.
 * - Throws an error if the validation fails.
 * - The default error message is: 'Invalid path'.
 * - A custom `errorMessage` can be provided as a parameter.
 *   - The `errorMessage` can be a string or a function that returns a string.
 *   - The function receives an object with `_` and `__` properties to access the translation functions.
 *
 * Examples of valid upload paths:
 *
 * - `/image.webp`
 * - `/my-dir/my-image.webp`
 * - `/dir`
 *
 * Examples of invalid upload paths:
 *
 * - `image.webp`
 * - `/My-Image.webp`
 * - `/my.dir/image.webp`
 * - `/dir/`
 * - `/`
 */
export function uploadPathValidator<TDatabase extends GenericDatabase = GenericDatabase>(
  errorMessage?: CustomErrorMessage<TDatabase>,
): GenericValidator {
  return (value, { context }) => {
    if (isNull(value)) {
      return
    }

    let isValid = true

    if (isString(value)) {
      const parts = value.split('/')

      for (const [i, part] of parts.entries()) {
        if (i === 0) {
          if (part !== '') {
            isValid = false
            break
          }
        } else if (i === parts.length - 1) {
          if (!/^[a-z0-9\-\.]+$/.test(part)) {
            isValid = false
            break
          }
        } else {
          if (!/^[a-z0-9\-]+$/.test(part)) {
            isValid = false
            break
          }
        }
      }
    }

    if (!isValid) {
      const defaultErrorMessage = context.__('pruvious-orm', 'Invalid path')
      throw new Error(resolveCustomErrorMessage(errorMessage, defaultErrorMessage, pick(context, ['_', '__'])))
    }
  }
}
