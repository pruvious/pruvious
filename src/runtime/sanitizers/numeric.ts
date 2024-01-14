import { isRealNumber } from '../utils/number'
import { isString } from '../utils/string'

/**
 * Convert the input value to a number or retain the original value if it does not match any numeric representation.
 *
 * Note: The sanitizer only converts strings.
 *
 * @example
 * ```typescript
 * numericSanitizer({ value: 1 })       // 1
 * numericSanitizer({ value: '1' })     // 1
 * numericSanitizer({ value: '01.50' }) // 1.5
 * numericSanitizer({ value: 'f00' })   // 'f00'
 * ```
 */
export function numericSanitizer(context: { value: any }) {
  const casted = isString(context.value) ? +context.value : null
  return isRealNumber(casted) ? casted : context.value
}
