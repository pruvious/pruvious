/**
 * Checks if a `value` is a boolean.
 *
 * @example
 * ```ts
 * isBoolean(true) // true
 * isBoolean('')   // false
 * ```
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean'
}
