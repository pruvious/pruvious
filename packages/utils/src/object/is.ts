/**
 * Checks if a `key` is a key of an `object`.
 *
 * @example
 * ```ts
 * isKeyOf({ foo: 1 }, 'foo') // true
 * isKeyOf({ foo: 1 }, 'bar') // false
 * ```
 */
export function isKeyOf<T extends object, K extends keyof T>(object: T, key: K): key is K {
  return key in object
}

/**
 * Checks if a `value` is a normal object.
 *
 * @example
 * ```ts
 * isObject({})   // true
 * isObject([])   // false
 * isObject(null) // false
 * ```
 */
export function isObject<T extends Record<string, any>>(value: any): value is T {
  return Object.prototype.toString.call(value) === '[object Object]'
}

/**
 * Checks if a `value` is serializable.
 *
 * @example
 * ```ts
 * isSerializable({ foo: 'bar' })       // true
 * isSerializable({ foo: () => 'bar' }) // false
 * ```
 */
export function isSerializable(value: any): boolean {
  const seen = new WeakSet()

  function check(v: any) {
    if (typeof v === 'object' && v !== null) {
      if (seen.has(v)) {
        return false
      }

      seen.add(v)

      return Object.values(v).every(check)
    }

    if (typeof v === 'bigint') {
      return false
    }

    if (typeof v === 'function' || typeof v === 'symbol' || v === undefined) {
      return false
    }

    return true
  }

  return check(value)
}
