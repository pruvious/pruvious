import { isString } from '../utils/string'

/**
 * Convert the input value to a boolean or retain the original value if it does not match any boolean-like representation.
 *
 * @example
 * ```typescript
 * booleanishSanitizer({ value: 1 })       // true
 * booleanishSanitizer({ value: 'false' }) // false
 * booleanishSanitizer({ value: 'YES' })   // true
 * booleanishSanitizer({ value: -1 })      // -1
 * ```
 */
export function booleanishSanitizer(context: { value: any }) {
  const v = isString(context.value) ? context.value.toLowerCase() : context.value
  const t = [true, 1, '1', 'true', 't', 'yes', 'y']
  const f = [false, 0, '0', 'false', 'f', 'no', 'n']

  return t.includes(v) ? true : f.includes(v) ? false : context.value
}
