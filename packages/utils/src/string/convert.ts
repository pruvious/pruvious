import { isRealNumber } from '../number/is'
import { isNumericString, isString } from './is'

/**
 * Converts a `value` to a string.
 * If the `value` does not match any string-like representation, the original value is retained.
 *
 * Note: This function can be used to convert a number to a string.
 *
 * @example
 * ```ts
 * castToString('foo') // 'foo'
 * castToString(1)     // '1'
 * castToString(NaN)   // NaN
 * castToString(true)  // true
 * ```
 */
export function castToString<T>(value: T): T | string {
  return isRealNumber(value) ? String(value) : value
}

/**
 * Converts a `value` to a numeric string.
 * If the `value` does not match any ***real*** number-like representation, the original value is retained.
 *
 * @example
 * ```ts
 * castToNumericString(1)       // '1'
 * castToNumericString('1')     // '1'
 * castToNumericString('01.50') // '1.5'
 * castToNumericString('f00')   // 'f00'
 * ```
 */
export function castToNumericString<T>(value: T): T | string {
  let casted = castToString(value)

  if (isString(casted)) {
    if (casted === '0') {
      return casted
    }

    if (casted[0] === '0' || (casted[0] === '-' && casted[1] === '0')) {
      casted = casted.replace(/^(-?)0+?([1-9])/, '$1$2')
    }

    casted = casted.replace(',', '.')

    if (casted.includes('.') && casted[casted.length - 1] === '0') {
      casted = casted.replace(/0+$/, '')

      if (casted[casted.length - 1] === '.') {
        casted = casted.slice(0, -1)
      }
    }

    return isNumericString(casted) ? casted : value
  }

  return value
}
