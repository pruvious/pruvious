/**
 * Checks if a `value` is a `bigint`.
 *
 * @example
 * ```ts
 * isBigInt(1n) // true
 * isBigInt(1)  // false
 * ```
 */
export function isBigInt(value: any): value is bigint {
  return typeof value === 'bigint'
}

/**
 * Checks if a `value` is an integer.
 *
 * @example
 * ```ts
 * isInteger(1)   // true
 * isInteger(0)   // true
 * isInteger(-1)  // true
 * isInteger(1.5) // false
 * isInteger('1') // false
 * ```
 */
export function isInteger(value: any): value is number {
  return isRealNumber(value) && Number.isInteger(value)
}

/**
 * Checks if a `value` is a number.
 *
 * @example
 * ```ts
 * isNumber(1)        // true
 * isNumber(NaN)      // true
 * isNumber(Infinity) // true
 * isNumber('1')      // false
 * ```
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number'
}

/**
 * Checks if a `value` is a positive integer.
 *
 * @example
 * ```ts
 * isPositiveInteger(1)   // true
 * isPositiveInteger(0)   // false
 * isPositiveInteger(-1)  // false
 * isPositiveInteger(1.5) // false
 * isPositiveInteger('1') // false
 * ```
 */
export function isPositiveInteger(value: any): value is number {
  return isRealNumber(value) && isInteger(value) && value > 0
}

/**
 * Checks if a `value` is a real number.
 *
 * @example
 * ```ts
 * isRealNumber(1)   // true
 * isRealNumber('1') // false
 * isRealNumber(NaN) // false
 * ```
 */
export function isRealNumber(value: any): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
