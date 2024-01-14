import {
  isBoolean as _isBoolean,
  isDate as _isDate,
  isNull as _isNull,
  isRegExp as _isRegExp,
  isUndefined as _isUndefined,
  isDef,
} from '@antfu/utils'

/**
 * Check if a `value` is a boolean.
 *
 * @example
 * ```typescript
 * isBoolean(true)  // true
 * isBoolean(false) // true
 * isBoolean(1)     // false
 * isBoolean(0)     // false
 * ```
 */
export const isBoolean: (value: any) => value is boolean = _isBoolean

/**
 * Check if a `value` is a date object.
 *
 * @example
 * ```typescript
 * isDate(new Date())    // true
 * isDate('2023-08-09')  // false
 * isDate(1691539200000) // false
 * ```
 */
export const isDate: (value: any) => value is Date = _isDate

/**
 * Check if a `value` is defined.
 *
 * @example
 * ```typescript
 * isDefined(0)         // true
 * isDefined(null)      // true
 * isDefined(NaN)       // true
 * isDefined(undefined) // false
 * ```
 */
export const isDefined: <T = any>(value?: T) => value is T = isDef

/**
 * Check if a `value` is `null`.
 *
 * @example
 * ```typescript
 * isNull(null)      // true
 * isNull(0)         // false
 * isNull(undefined) // false
 * isNull('')        // false
 * ```
 */
export const isNull: (value: any) => value is null = _isNull

/**
 * Check if a `value` is a file object.
 *
 * @example
 * ```typescript
 * isFile(new File(['foo'], 'foo.txt', { type: 'text/plain' })) // true
 * isFile(new Blob(['foo'], { type: 'text/plain' }))            // false
 * isFile('foo')                                                // false
 * ```
 */
export const isFile = (value: any): value is File => value instanceof File

/**
 * Check if a `value` is a regular expression.
 *
 * @example
 * ```typescript
 * isRegExp(/./)              // true
 * isRegExp(new RegeExp('.')) // true
 * isRegExp('')               // false
 * ```
 */
export const isRegExp: (value: any) => value is RegExp = _isRegExp

/**
 * Check if a `value` is `undefined`.
 *
 * @example
 * ```typescript
 * isUndefined(undefined) // true
 * isUndefined(null)      // false
 * isUndefined('')        // false
 * isUndefined(0)         // false
 * ```
 */
export const isUndefined: (value: any) => value is undefined = _isUndefined
