import { isArray, isFunction, isObject } from '@pruvious/utils'

/**
 * Serializes translatable string functions to a format that can be sent to the client.
 * This affects all functions in the provided `object`.
 */
export function serializeTranslatableStringCallbacks<T>(object: T): T {
  if (isObject(object)) {
    return Object.fromEntries(
      Object.entries(object).map(([key, value]) => [key, serializeTranslatableStringCallbacks(value)]),
    ) as T
  } else if (isArray(object)) {
    return object.map(serializeTranslatableStringCallbacks) as T
  } else if (isFunction(object)) {
    return `EVAL::${object.toString()}` as T
  }

  return object
}
