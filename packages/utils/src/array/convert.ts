import { isArray } from './is'

/**
 * Converts a `value` to an array.
 *
 * @example
 * ```ts
 * toArray(1)   // [1]
 * toArray([1]) // [1]
 * toArray()    // []
 * ```
 */
export function toArray<T>(value?: T | Array<T>): Array<T> {
  value ??= []
  return isArray(value) ? value : [value]
}
