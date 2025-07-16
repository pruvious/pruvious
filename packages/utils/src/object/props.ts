import { deleteProperty as _deleteProperty, getProperty as _getProperty, setProperty as _setProperty } from 'dot-prop'
import { isArray } from '../array/is'
import { resolveRelativeDotNotation } from '../misc/path'

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
 * Converts an object with dot notation keys into a nested object structure.
 *
 * @example
 * ```ts
 * dotNotationsToObject({ 'foo.bar': 'baz', 'foo.baz.qux': 'quux' })
 * // { foo: { bar: 'baz', baz: { qux: 'quux' } } }
 * ```
 */
export function dotNotationsToObject(dotNotations: Record<string, any>): Record<string, any> {
  const result = {}

  for (const path in dotNotations) {
    if (Object.prototype.hasOwnProperty.call(dotNotations, path)) {
      setProperty(result, path, dotNotations[path])
    }
  }

  return result
}

function convertDotToBracket(path: string) {
  if (/^\d+$/.test(path)) {
    return `[${path}]`
  }

  return path.replace(/\.(\d+)(?=\.|$)/g, '[$1]').replace(/^(\d+)/, '[$1]')
}
