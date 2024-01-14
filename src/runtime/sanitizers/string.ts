import { isRealNumber } from '../utils/number'

/**
 * Convert the input value to a string or retain the original value if it does not correspond to any alphanumeric representation.
 *
 * Note: The sanitizer only converts real numbers.
 *
 * @example
 * ```typescript
 * stringSanitizer({ value: 'foo' }) // 'foo'
 * stringSanitizer({ value: 1 })     // '1'
 * stringSanitizer({ value: NaN })   // NaN
 * stringSanitizer({ value: true })  // true
 * ```
 */
export function stringSanitizer(context: { value: any }) {
  return isRealNumber(context.value) ? context.value.toString() : context.value
}
