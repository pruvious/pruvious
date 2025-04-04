import { deleteProperty as _deleteProperty, getProperty as _getProperty, setProperty as _setProperty } from 'dot-prop'
import { isArray } from '../array/is'
import { isDefined } from '../common/is'
import { resolveRelativeDotNotation } from '../misc/path'
import { isObject } from './is'

/**
 * Creates a deep clone of an `object`.
 *
 * Note: It does not clone functions.
 *
 * @example
 * ```ts
 * const original = { foo: { bar: 1 } }
 * const clone = deepClone(original) // { foo: { bar: 1 } }
 * console.log(original === clone)   // false
 * ```
 */
export function deepClone<T>(object: T): T {
  if (object === null || typeof object !== 'object') {
    return object
  }

  if (isArray(object)) {
    return object.map((item) => deepClone(item)) as any
  }

  const clone: any = {}

  for (const key of Object.getOwnPropertyNames(object)) {
    clone[key] = deepClone(object[key as keyof T])
  }

  for (const symbol of Object.getOwnPropertySymbols(object)) {
    clone[symbol] = deepClone((object as any)[symbol])
  }

  return clone
}

/**
 * Deeply compares two values.
 *
 * @example
 * ```ts
 * deepCompare({}, {})         // true
 * deepCompare([1, 2], [2, 1]) // false
 * ```
 */
export function deepCompare(a: any, b: any): boolean {
  if (a === b) {
    return true
  } else if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) {
      return false
    }

    for (const key of keysA) {
      if (!deepCompare(a[key], b[key])) {
        return false
      }
    }

    return true
  } else if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) {
      return false
    }

    for (let i = 0; i < a.length; i++) {
      if (!deepCompare(a[i], b[i])) {
        return false
      }
    }

    return true
  }

  return false
}

/**
 * Returns the names of the enumerable string properties and methods of an `object`.
 *
 * @example
 * ```ts
 * const object = { foo: 1, bar: 2, baz: 3 }
 * const result = keys(object) // ['foo', 'bar', 'baz']
 * ```
 */
export function keys<T extends object>(object: T): (keyof T)[] {
  return Object.keys(object) as (keyof T)[]
}

/**
 * Picks the specified `keys` from an `object`.
 *
 * @example
 * ```ts
 * const object = { foo: 1, bar: 2, baz: 3 }
 * const result = pick(object, ['foo', 'baz']) // { foo: 1, baz: 3 }
 * ```
 */
export function pick<T, K extends keyof T>(object: T, keys: K[]): Pick<T, K> {
  const result: any = {}

  for (const key of keys) {
    result[key] = object[key]
  }

  return result
}

/**
 * Omits the specified `keys` from an `object`.
 *
 * @example
 * ```ts
 * const object = { foo: 1, bar: 2, baz: 3 }
 * const result = omit(object, ['foo', 'baz']) // { bar: 2 }
 * ```
 */
export function omit<T, K extends keyof T>(object: T, keys: K[]): Omit<T, K> {
  const result: any = {}

  for (const key in object) {
    if (!keys.includes(key as any)) {
      result[key] = object[key]
    }
  }

  return result
}

/**
 * Retrieves a property from an `object` using a specified `path` in dot notation.
 *
 * @example
 * ```ts
 * getProperty({ foo: { bar: 'baz' }}, 'foo.bar') // 'baz'
 * getProperty({ foo: ['bar', 'baz']}, 'foo.1')   // 'baz'
 * getProperty({ foo: ['bar', 'baz']}, 'foo', 1)  // 'baz'
 * getProperty({ foo: { bar: 'baz' }}, 'bar')     // undefined
 * ```
 */
export function getProperty<T extends any>(
  object: Record<string, any>,
  path: string,
  ...append: (string | number)[]
): T {
  if (append.length) {
    path = resolveRelativeDotNotation(`${path}._`, append.join('/'))
  }

  path = convertDotToBracket(path)
  return path ? _getProperty(object, path) : (object as T)
}

/**
 * Sets a property on an `object` to a specified `value` using a `path` in dot notation.
 *
 * @example
 * ```ts
 * setProperty({ foo: {}}, 'foo.bar', { bar: 'baz' }) // { foo: { bar: 'baz' } }
 * setProperty({ foo: ['bar']}, 'foo.1', 'baz)        // { foo: ['bar', 'baz'] }
 * ```
 */
export function setProperty<T extends Record<string, any>>(object: T, path: string, value: any): T {
  return _setProperty(object, convertDotToBracket(path), value)
}

/**
 * Removes a property from an `object` using a specified `path` in dot notation.
 *
 * @example
 * ```ts
 * deleteProperty({ foo: { bar: 'baz' }}, 'foo.bar') // true
 * deleteProperty({ foo: ['bar', 'baz']}, 'foo.1')   // true
 * deleteProperty({ foo: { bar: 'baz' }}, 'bar')     // false
 * ```
 */
export function deleteProperty(object: Record<string, any>, path: string): any {
  const prop = path.replace(/\.([0-9]+)(\.|$)/gm, '[$1]$2')

  if (prop.endsWith(']')) {
    const index = +prop.slice(prop.lastIndexOf('[') + 1, -1)
    const array = _getProperty(object, prop.slice(0, prop.lastIndexOf('['))) as any

    if (isArray(array)) {
      array.splice(index, 1)
      return true
    }

    return false
  }

  return _deleteProperty(object, prop)
}

/**
 * Anonymizes an `object` by replacing its primitive values with their corresponding types.
 * It does not modify the original `object`.
 *
 * @example
 * ```ts
 * anonymizeObject({ foo: 'bar', baz: 1 }) // { foo: 'string', baz: 'number' }
 * anonymizeObject(['foo', 1, true])       // ['string', 'number', 'boolean']
 * anonymizeObject('foo')                  // 'foo'
 * ```
 */
export function anonymizeObject(object: any): any {
  if (isObject(object)) {
    const result: Record<string, any> = {}

    for (const key in object) {
      if (isObject(object[key]) || isArray(object[key])) {
        result[key] = anonymizeObject(object[key])
      } else {
        result[key] = typeof object[key]
      }
    }

    return result
  } else if (isArray(object)) {
    return object.map((v) => (isObject(v) || isArray(v) ? anonymizeObject(v) : typeof v))
  }

  return object
}

/**
 * Shallow merges multiple `objects` into a new object and removes any `undefined` values.
 *
 * @example
 * ```ts
 * cleanMerge({ foo: 'bar' }, { bar: 'baz' })     // { foo: 'bar', bar: 'baz' }
 * cleanMerge({ foo: 'bar' }, { foo: 'baz' })     // { foo: 'baz' }
 * cleanMerge({ foo: 'bar' }, { bar: undefined }) // { foo: 'bar' }
 * ```
 */
export function cleanMerge<T extends Record<string, any>>(...objects: T[]): Partial<T> {
  const merged: any = {}

  for (const object of objects) {
    for (const [key, value] of Object.entries(object)) {
      if (isDefined(value)) {
        merged[key] = value
      }
    }
  }

  return merged
}

/**
 * Removes all properties or elements from an object or array while preserving its original type.
 *
 * @example
 * ```ts
 * clear({ foo: 'bar' }) // {}
 * clear(['foo', 'bar']) // []
 * ```
 */
export function clear<T>(object: T): T {
  if (isArray(object)) {
    object.splice(0, object.length)
  } else if (isObject(object)) {
    for (const property of Object.getOwnPropertyNames(object)) {
      delete object[property]
    }
  }

  return object
}

/**
 * Remaps an `object` by applying a `mapper` function to each of its properties.
 *
 * @example
 * ```ts
 * remap({ a: 1, b: 2 }, (key, value) => [key, value * value])
 * // { a: 1, b: 4 }
 *
 * remap({ foo: { bar: 'baz' }}, (key, { bar }) => [key, bar.toUpperCase()])
 * // { foo: 'BAZ' }
 * ```
 */
export function remap<const TInput extends Record<string, unknown>, TKey extends string, TValue>(
  object: TInput,
  mapper: (key: keyof TInput & string, value: TInput[keyof TInput & string]) => [TKey, TValue],
): Record<TKey, TValue> {
  const result = {} as Record<TKey, TValue>

  for (const [key, value] of Object.entries(object)) {
    const [newKey, newValue] = mapper(key as keyof TInput & string, value as TInput[keyof TInput & string])
    result[newKey] = newValue
  }

  return result
}

/**
 * Filters an `object` by applying a `filter` function to each of its properties.
 *
 * @example
 * ```ts
 * filterObject({ a: 1, b: 2 }, (key, value) => value % 2 === 0)
 * // { b: 2 }
 *
 * filterObject({ foo: 'bar', baz: 'qux' }, (key, value) => key === 'foo')
 * // { foo: 'bar' }
 * ```
 */
export function filterObject<T extends Record<string, any>>(
  object: T,
  filter: (key: keyof T, value: T[keyof T]) => boolean,
): Partial<T> {
  const result: any = {}

  for (const [key, value] of Object.entries(object)) {
    if (filter(key as keyof T, value as T[keyof T])) {
      result[key] = value
    }
  }

  return result
}

/**
 * Walks through an `object` and yields each object, its parent, and its path.
 * The path is a string that represents the path to reach the current object using dot notation.
 * The parent is the direct parent container (object or array) of the current object.
 *
 * @example
 * ```ts
 * const object = { foo: { bar: 'baz' }}
 *
 * for (const { object, parent, path } of walkObjects(object)) {
 *   console.log(object, parent, path)
 * }
 *
 * // Output:
 * // { foo: { bar: 'baz' }} null ''
 * // { bar: 'baz' } { foo: { bar: 'baz' }} foo
 * ```
 */
export function* walkObjects(value: any): Generator<{
  /**
   * The currently iterated object in the loop.
   */
  object: Record<string, any>

  /**
   * The direct parent container (object or array) of the current `object`.
   * Will be `null` if there is no parent.
   */
  parent: Record<string, any> | any[] | null

  /**
   * The complete path to reach the current `object`, using dot notation (e.g. '0.items.2.name').
   */
  path: string
}> {
  function* walk(
    value: any,
    parent: Record<string, any> | any[] | null,
    prevPath: string,
  ): Generator<{
    object: Record<string, any>
    parent: Record<string, any> | any[] | null
    path: string
  }> {
    if (isObject(value)) {
      yield { object: value, parent, path: prevPath }

      for (const key in value) {
        yield* walk(value[key], value, prevPath ? `${prevPath}.${key}` : key)
      }
    } else if (isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const path = prevPath ? `${prevPath}.${i}` : i.toString()
        yield* walk(value[i], value, path)
      }
    }
  }

  yield* walk(value, null, '')
}

/**
 * Creates a new object by inverting the key-value pairs of the input `object`.
 *
 * @example
 * ```ts
 * invertMap({ foo: 'bar', baz: 'qux' }) // { bar: 'foo', qux: 'baz' }
 * ```
 */
export function invertMap<K extends string | number | symbol, V extends string | number | symbol>(
  object: Record<K, V>,
): Record<V, K> {
  const invertedEntries = Object.entries(object).map(([key, value]) => [value, key])
  return Object.fromEntries(invertedEntries) as Record<V, K>
}

function convertDotToBracket(path: string) {
  if (/^\d+$/.test(path)) {
    return `[${path}]`
  }

  return path.replace(/\.(\d+)(?=\.|$)/g, '[$1]').replace(/^(\d+)/, '[$1]')
}
