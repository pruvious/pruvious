import { isArray } from '../array/is'
import { isBoolean } from '../boolean/is'
import { isRealNumber } from '../number/is'
import { isObject } from '../object/is'
import { isString } from '../string/is'

/**
 * Checks if a `value` is `null`.
 *
 * @example
 * ```ts
 * isObject(null) // true
 * isObject(0)    // false
 * ```
 */
export function isNull(value: any): value is null {
  return value === null
}

/**
 * Checks if a `value` is not `null`.
 *
 * @example
 * ```ts
 * isObject(null) // false
 * isObject(0)    // true
 * ```
 */
export function isNotNull<T>(value: T | null): value is T {
  return !isNull(value)
}

/**
 * Checks if a `value` is `undefined`.
 *
 * @example
 * ```ts
 * isObject(undefined) // true
 * isObject(null)      // false
 * ```
 */
export function isUndefined(value: any): value is undefined {
  return value === undefined
}

/**
 * Checks if a `value` is not `undefined`.
 *
 * @example
 * ```ts
 * isDefined(undefined) // false
 * isDefined(null)      // true
 * ```
 */
export function isDefined<T>(value: T | undefined): value is T {
  return !isUndefined(value)
}

/**
 * Checks if a `value` is a primitive.
 *
 * @example
 * ```ts
 * isPrimitive('')   // true
 * isPrimitive(1)    // true
 * isPrimitive(true) // true
 * isPrimitive(null) // true
 * isPrimitive({})   // false
 * isPrimitive([])   // false
 * ```
 */
export function isPrimitive(value: any): value is boolean | null | number | string | undefined {
  return isBoolean(value) || isNull(value) || isRealNumber(value) || isString(value) || isUndefined(value)
}

/**
 * Checks if a `value` is empty.
 *
 * @example
 * ```ts
 * isEmpty(0)        // true
 * isEmpty('')       // true
 * isEmpty(false)    // true
 * isEmpty(null)     // true
 * isEmpty([])       // true
 * isEmpty({})       // true
 * isEmpty(' ')      // false
 * isEmpty({ a: 1 }) // false
 * isEmpty([0])      // false
 * ```
 */
export function isEmpty<T>(
  value: T,
): value is T &
  (T extends number
    ? 0
    : T extends string
      ? ''
      : T extends boolean
        ? false
        : T extends null
          ? null
          : T extends undefined
            ? undefined
            : T extends any[]
              ? []
              : T extends object
                ? Record<string, never>
                : never) {
  return (
    value === 0 ||
    value === '' ||
    value === false ||
    value === null ||
    value === undefined ||
    (isArray(value) && value.length === 0) ||
    (isObject(value) && Object.keys(value).length === 0)
  )
}
