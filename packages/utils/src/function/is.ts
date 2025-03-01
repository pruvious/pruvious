/**
 * Checks if a `value` is a function.
 *
 * @example
 * ```ts
 * isFunction(() => {}) // true
 * isFunction('')       // false
 * ```
 */
export function isFunction<T extends Function>(value: any): value is T {
  return typeof value === 'function'
}
