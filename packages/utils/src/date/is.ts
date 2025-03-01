/**
 * Checks if a `value` is a `Date` object.
 *
 * @example
 * ```ts
 * isDate(new Date())   // true
 * isDate('2021-01-01') // false
 * ```
 */
export function isDate(value: any): value is Date {
  return Object.prototype.toString.call(value) === '[object Date]'
}
