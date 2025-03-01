/**
 * Checks if a `value` is an array.
 *
 * @example
 * ```ts
 * isArray([]) // true
 * isArray({}) // false
 * ```
 */
export function isArray<T>(value: any): value is T[] {
  return Array.isArray(value)
}
