import { createDefu } from 'defu'
import { isArray } from '../array/is'

/**
 * Merges objects deeply while preserving arrays from the source object.
 * Leftmost parameters have more priority when assigning defaults (object, ...defaults).
 *
 * This is a modified version of the `defu` utility that treats arrays differently.
 * Instead of merging arrays, it completely replaces them with the source value.
 *
 * The input objects will not be mutated.
 *
 * @see https://github.com/unjs/defu
 *
 * @example
 * ```ts
 * defu({ settings: { theme: 'dark' } }, { settings: { language: 'en' } })
 * // Result: { settings: { theme: 'dark', language: 'en' } }
 *
 * defu({ items: [1, 2] }, { items: [3, 4] }) // Array is replaced, not merged
 * // Result: { items: [1, 2] }
 * ```
 */
export const defu = createDefu((object, key, value) => {
  if (isArray(object[key])) {
    object[key] = value
    return true
  }
})
