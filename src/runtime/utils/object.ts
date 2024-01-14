import {
  deepMerge as _deepMerge,
  isKeyOf as _isKeyOf,
  isObject as _isObject,
  objectPick as _objectPick,
  type DeepMerge,
} from '@antfu/utils'
import { createDefu } from 'defu'
import { deleteProperty as _deleteProperty, getProperty as _getProperty, setProperty as _setProperty } from 'dot-prop'
import { isArray } from './array'
import { isString, snakeCase } from './string'

/**
 * Delete all entries of an `object`.
 *
 * @example
 * ```typescript
 * clearObject({ foo: 'bar' }) // {}
 * ```
 */
export function clearObject<T extends Record<string, any>>(object: T): T {
  if (isArray(object)) {
    object.splice(0, object.length)
  } else if (object && typeof object === 'object') {
    for (const property of Object.getOwnPropertyNames(object)) {
      delete object[property]
    }
  }

  return object
}

/**
 * Create a deep clone of an `object`.
 *
 * Note: It does not clone functions.
 *
 * @example
 * ```typescript
 * const original = { foo: { bar: 1 } }
 * const clone = deepClone(original)
 * console.log(clone) // { foo: { bar: 1 } }
 * console.log(original === clone) // false
 * ```
 */
export function deepClone<T extends Record<string, any>>(object: T): T {
  if (object === null || typeof object !== 'object') {
    return object
  }

  if (isArray(object)) {
    return object.map((item) => deepClone(item)) as any
  }

  const clone: any = {}

  for (const key of Object.getOwnPropertyNames(object)) {
    clone[key] = deepClone(object[key])
  }

  for (const symbol of Object.getOwnPropertySymbols(object)) {
    clone[symbol] = deepClone((object as any)[symbol])
  }

  return clone
}

/**
 * Perform a deep merge of objects.
 *
 * The first argument is the `target` object, and the rest are the `sources`.
 * The `target` object will be mutated and returned.
 *
 * @example
 * ```typescript
 * deepMerge({ foo: { bar: 1 } }, { foo: { baz: 2 } })
 * // Output: { foo: { bar: 1, baz: 2 } }
 * ```
 */
export const deepMerge: <T extends object = object, S extends object = T>(
  target: T,
  ...sources: S[]
) => DeepMerge<T, S> = _deepMerge

/**
 * Delete an `object` property at the given `path`.
 *
 * @example
 * ```typescript
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
 * Get the value of an `object` property at the given `path`.
 *
 * @example
 * ```typescript
 * getProperty({ foo: { bar: 'baz' }}, 'foo.bar') // 'baz'
 * getProperty({ foo: ['bar', 'baz']}, 'foo.1')   // 'baz'
 * getProperty({ foo: { bar: 'baz' }}, 'bar')     // undefined
 * ```
 */
export function getProperty<T extends any>(object: Record<string, any>, path: string): T {
  return _getProperty(object, path.replace(/\.([0-9]+)(\.|$)/gm, '[$1]$2'))
}

/**
 * Verify if an `object` includes the given `key`.
 *
 * @example
 * ```typescript
 * isKeyOf({ foo: 'bar' }, 'foo') // true
 * isKeyOf({ foo: 'bar' }, 'bar') // false
 * ```
 */
export function isKeyOf<T extends object>(object: T, key: keyof any): key is keyof T {
  return _isKeyOf(object, key)
}

/**
 * Check if a `value` is a normal object.
 *
 * @example
 * ```typescript
 * isObject({})   // true
 * isObject([])   // false
 * isObject(null) // false
 * ```
 */
export const isObject: <T extends object>(value: any) => value is T = _isObject as any

/**
 * Recursively assign default properties with priority given to leftmost arguments.
 *
 * Note: This is a customized `defu` merger that avoids merging arrays.
 *
 * @see https://github.com/unjs/defu
 *
 * @example
 * ```typescript
 * mergeDefaults({ foo: { bar: 1 } }, { foo: { baz: 2 } })
 * // Output: { foo: { bar: 1, baz: 2} }
 * ```
 */
export const mergeDefaults = createDefu((object, key, value) => {
  if (isArray(object[key])) {
    object[key] = value
    return true
  }
})

/**
 * Create a new subset object by omitting the specified `keys`.
 *
 * @example
 * ```typescript
 * objectOmit({ foo: 'bar', baz: 'qux' }, ['baz']) // { foo: 'bar' }
 * ```
 */
export function objectOmit<O extends object, T extends keyof O>(object: O, keys: T[]) {
  const newObject: Record<string, any> = {}

  for (const key of Object.keys(object)) {
    if (!keys.includes(key as any)) {
      newObject[key] = object[key as keyof O]
    }
  }

  return newObject as Omit<O, T>
}

/**
 * Create a new subset object with the specified `keys`.
 *
 * @example
 * ```typescript
 * objectPick({ foo: 'bar', baz: 'qux' }, ['foo']) // { foo: 'bar' }
 * ```
 */
export const objectPick: <O extends object, T extends keyof O>(object: O, keys: T[]) => Pick<O, T> = _objectPick

/**
 * Set an `object` property at the given `path` to the given `value`.
 *
 * @example
 * ```typescript
 * setProperty({ foo: {}}, 'foo.bar', { bar: 'baz' }) // { foo: { bar: 'baz' } }
 * setProperty({ foo: ['bar']}, 'foo.1', 'baz)        // { foo: ['bar', 'baz'] }
 * ```
 */
export function setProperty<T extends Record<string, any>>(object: T, path: string, value: any): T {
  return _setProperty(object, path.replace(/\.([0-9]+)(\.|$)/gm, '[$1]$2'), value)
}

/**
 * Convert property names of an `object` to snake case.
 *
 * Note: This function mutates the original object.
 *
 * @example
 * ```typescript
 * snakeCasePropNames({ fooBar: 'baz' }) // { foo_bar: 'baz' }
 * ```
 */
export function snakeCasePropNames(object: object): object {
  for (const { key, value, parent } of walkObject(object)) {
    if (isString(key)) {
      const snakeKey = snakeCase(key)

      if (snakeKey !== key) {
        ;(parent as any)[snakeKey] = value
        delete (parent as any)[key]
      }
    }
  }

  return object
}

/**
 * Creates a new object with symbol keys converted to string keys, while keeping the original `object` unchanged.
 *
 * @example
 * ```typescript
 * stringifySymbols({ [Op.and]: [] }) // { 'Symbol(and)': [] }
 * ```
 */
export function stringifySymbols(object: object): object {
  if (object === null || typeof object !== 'object') {
    return object
  }

  if (isArray(object)) {
    return object.map((item) => stringifySymbols(item)) as any
  }

  const clone: any = {}

  for (const key of Object.getOwnPropertyNames(object)) {
    clone[key] = stringifySymbols((object as any)[key])
  }

  for (const symbol of Object.getOwnPropertySymbols(object)) {
    clone[symbol.toString()] = stringifySymbols((object as any)[symbol])
  }

  return clone
}

/**
 * A generator function that walks through the properties of an `object` and yields key-value pairs.
 */
export function* walkObject(
  object: object,
): IterableIterator<{ key: number | string | symbol; value: any; parent: object }> {
  if (object !== null && typeof object === 'object') {
    if (isArray(object)) {
      for (const [key, value] of object.entries()) {
        yield { key, value, parent: object }
        yield* walkObject(value)
      }
    } else {
      for (const key of Object.getOwnPropertyNames(object)) {
        yield { key, value: (object as any)[key], parent: object }
        yield* walkObject((object as any)[key])
      }

      for (const symbol of Object.getOwnPropertySymbols(object)) {
        yield { key: symbol, value: (object as any)[symbol], parent: object }
        yield* walkObject((object as any)[symbol])
      }
    }
  }
}
