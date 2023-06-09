/**
 * Delete all entries of an `object`.
 *
 * @example
 * clearObject({ foo: 'bar' }) // {}
 */
export function clearObject<T extends object>(object: T): T {
  if (Array.isArray(object)) {
    object.splice(0, object.length)
  } else if (object && typeof object === 'object') {
    for (const property of Object.getOwnPropertyNames(object)) {
      delete object[property]
    }
  }

  return object
}

/**
 * Fill in missing entries in `object1` with entries from `object2`.
 *
 * @example
 * fillObject({ foo: 'bar' }, { foo: 'baz', bar: 'baz' }) // { foo: 'bar', bar: 'baz' }
 */
export function fillObject<T extends object>(object1: T, object2: T): T {
  Object.entries(object2).forEach(([key, defaultValue]) => {
    if (!object1.hasOwnProperty(key)) {
      object1[key] = defaultValue
    }
  })

  return object1
}

/**
 * Fill in missing entries in `object1` with entries from `object2` recursively.
 *
 * @example
 * fillObjectDeep({ foo: { bar: 'baz' } }, { foo: { baz: 'qux' } }) // { foo: { bar: 'baz', baz: 'qux' } }
 */
export function fillObjectDeep<T extends object>(object1: T, object2: T): T {
  Object.entries(object2).forEach(([key, defaultValue]) => {
    if (object1.hasOwnProperty(key) && isObject(object1[key])) {
      fillObjectDeep(object1[key], defaultValue)
    } else if (!object1.hasOwnProperty(key)) {
      if (isObject(defaultValue)) {
        object1[key] = {}
        fillObjectDeep(object1[key], defaultValue)
      } else {
        object1[key] = defaultValue
      }
    }
  })

  return object1
}

/**
 * Check if an `item` is an object, but not an array or null.
 *
 * @example
 * isObject({}) // true
 * isObject([]) // false
 */
export function isObject(item: any): boolean {
  return !!item && typeof item === 'object' && !Array.isArray(item)
}

/**
 * Deep merge objects.
 *
 * @example mergeDeep({ foo: { bar: 1 } }, { foo: { baz: 2 } }) // { foo: { bar: 1, baz: 2 } }
 */
export function mergeDeep<T extends Record<any, any>>(target: T, ...sources: T[]) {
  if (!sources.length) {
    return target
  }

  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} })
        }

        mergeDeep(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return mergeDeep(target, ...sources)
}
