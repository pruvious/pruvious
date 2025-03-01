import { isString } from '../string/is'
import { isRealNumber } from './is'

/**
 * Converts a `value` to a number.
 * If the `value` does not match any ***real*** number-like representation, the original value is retained.
 *
 * @example
 * ```ts
 * castToNumber(1)       // 1
 * castToNumber('1')     // 1
 * castToNumber('01.50') // 1.5
 * castToNumber('f00')   // 'f00'
 * ```
 */
export function castToNumber<T>(value: T): T | number {
  const casted = isString(value) && value.trim().length ? +value.replace(',', '.') : null
  return isRealNumber(casted) ? casted : value
}
