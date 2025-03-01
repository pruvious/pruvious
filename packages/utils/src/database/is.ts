import { isString } from '../string/is'

/**
 * Checks if a `value` is a valid database table or column name.
 *
 * Caveat: The identifier must not contain double underscores.
 *
 * @example
 * ```ts
 * isDatabaseIdentifier('Products')   // true
 * isDatabaseIdentifier('updatedAt')  // true
 * isDatabaseIdentifier('created-at') // false
 * isDatabaseIdentifier('created at') // false
 * ```
 */
export function isDatabaseIdentifier(value: unknown): value is string {
  return isString(value) && /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(value) && !value.includes('__')
}
