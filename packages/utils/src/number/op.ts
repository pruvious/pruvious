import { castToNumber } from './convert'
import { isPositiveInteger } from './is'

/**
 * Restricts a `number` to stay within a specified range.
 *
 * @example
 * ```ts
 * clamp(5, 0, 10)  // 5
 * clamp(-5, 0, 10) // 0
 * clamp(15, 0, 10) // 10
 * ```
 */
export function clamp(number: number, min: number, max: number) {
  return Math.min(max, Math.max(min, number))
}

/**
 * Gets the number of decimal places in a number.
 *
 * @example
 * ```ts
 * countDecimals(1)    // 0
 * countDecimals(1.5)  // 1
 * countDecimals(1.25) // 2
 * ```
 */
export function countDecimals(value: number): number {
  return value.toString().split('.')[1]?.length || 0
}

/**
 * Parses an ID from a string or number.
 * If the value is not a positive integer, `null` is returned.
 *
 * @example
 * ```ts
 * parseId(1)   // 1
 * parseId('2') // 2
 * parseId(0)   // null
 * parseId(1.5) // null
 * ```
 */
export function parseId(value: any): number | null {
  const id = castToNumber(value)
  return isPositiveInteger(id) ? id : null
}
