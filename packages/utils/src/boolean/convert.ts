import { isString } from '../string/is'

/**
 * Converts a `value` to a boolean.
 * If the `value` does not match any boolean-like representation, the original value is retained.
 *
 * @example
 * ```ts
 * castToBoolean(1)       // true
 * castToBoolean('false') // false
 * castToBoolean('YES')   // true
 * castToBoolean(-1)      // -1
 * ```
 */
export function castToBoolean<T>(value: T): T | boolean {
  const v = isString(value) ? value.toLowerCase() : value
  const t: any[] = [true, 1, '1', 'true', 't', 'yes', 'y']
  const f: any[] = [false, 0, '0', 'false', 'f', 'no', 'n']

  return t.includes(v) ? true : f.includes(v) ? false : value
}
