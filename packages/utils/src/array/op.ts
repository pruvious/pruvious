import { clamp } from '../number/op'
import { getProperty } from '../object/op'
import { isString } from '../string/is'
import { extractKeywords } from '../string/op'
import { toArray } from './convert'
import { isArray } from './is'

/**
 * Collator instance for sorting arrays in natural order.
 */
export const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/**
 * Removes all occurrences of an `item` from an array.
 *
 * - The `item` parameter can be a single value or an array of values.
 * - The `mutate` parameter specifies whether to modify the original array (default: `false`).
 *
 * @example
 * ```ts
 * const array = [1, 2, 3, 4, 5]
 *
 * // Without mutation (default)
 * remove(5, array)   // [1, 2, 3, 4]
 * console.log(array) // [1, 2, 3, 4, 5]
 *
 * // With mutation
 * remove([1, 2], array, true) // [3, 4, 5]
 * console.log(array)          // [3, 4, 5]
 * ```
 */
export function remove<T>(item: T | T[], array: T[], mutate = false): T[] {
  const array2 = mutate ? array : [...array]

  for (const v of toArray(item)) {
    let i: number

    do {
      i = array2.indexOf(v)

      if (i !== -1) {
        array2.splice(i, 1)
      }
    } while (i !== -1)
  }

  return array2
}

/**
 * Removes all occurrences of an `item` from an array based on a `prop`.
 *
 * - The `item` parameter can be a single object or an array of objects.
 * - The `mutate` parameter specifies whether to modify the original array (default: `false`).
 *
 * @example
 * ```ts
 * const array = [{ id: 1 }, { id: 2 }, { id: 3 }]
 *
 * // Without mutation (default)
 * removeByProp({ id: 3 }, array, 'id') // [{ id: 1 }, { id: 2 }]
 * console.log(array)                   // [{ id: 1 }, { id: 2 }, { id: 3 }]
 *
 * // With mutation
 * removeByProp([{ id: 1 }, { id: 2 }], array, 'id', true) // [{ id: 3 }]
 * console.log(array)                                      // [{ id: 3 }]
 * ```
 */
export function removeByProp<T, K extends keyof T>(item: T | T[], array: T[], prop: K, mutate = false): T[] {
  const array2 = mutate ? array : [...array]

  for (const v of toArray(item)) {
    let i: number

    do {
      i = array2.findIndex((item) => item[prop] === v[prop])

      if (i !== -1) {
        array2.splice(i, 1)
      }
    } while (i !== -1)
  }

  return array2
}

/**
 * Retrieves the item at index `n` of an `array`.
 * If `n` is negative, the nth item from the end is returned.
 *
 * @example
 * ```ts
 * nth(['foo', 'bar'], 0)  // 'foo'
 * nth(['foo', 'bar'], 1)  // 'bar'
 * nth(['foo', 'bar'], 2)  // 'foo'
 * nth(['foo', 'bar'], -2) // 'foo'
 * nth(['foo', 'bar'], -1) // 'bar'
 * ```
 */
export function nth<T>(array: T[], n: number): T {
  return array[nthIndex(array, n)]
}

/**
 * Retrieves the normalized index at index `n` of an `array`.
 * If `n` is negative, the nth normalized index from the end is returned.
 *
 * @example
 * ```ts
 * nth(['foo', 'bar'], 0)  // 0
 * nth(['foo', 'bar'], 1)  // 1
 * nth(['foo', 'bar'], 2)  // 0
 * nth(['foo', 'bar'], -2) // 0
 * nth(['foo', 'bar'], -1) // 1
 * ```
 */
export function nthIndex<T>(array: T[], n: number): number {
  n = n % array.length
  n += n < 0 ? array.length : 0

  return n
}

/**
 * Retrieves the item that precedes the `current` item in the given `array`.
 *
 * Additional options can be provided using the `options` parameter:
 *
 * - `prop` - The property to compare when the `array` items are objects (default: `undefined`).
 * - `loop` - Whether to loop back from the last item if the previous item exceeds the `array` bounds (default: `false`).
 * - `fallback` - Whether to return the first `array` item if the `current` item cannot be found (default: `false`).
 *
 * @example
 * ```ts
 * // Array of strings
 * prev('bar', ['foo', 'bar', 'baz']) // 'foo'
 *
 * // Array of objects
 * prev({ id: 2 }, [{ id: 1 }, { id: 2 }, { id: 3 }], { prop: 'id' }) // { id: 1 }
 *
 * // Without loop (default)
 * prev('foo', ['foo', 'bar']) // 'foo'
 *
 * // With loop
 * prev('foo', ['foo', 'bar'], { loop: true }) // 'bar'
 *
 * // Without fallback (default)
 * prev('baz', ['foo', 'bar']) // undefined
 *
 * // With fallback
 * prev('baz', ['foo', 'bar'], { fallback: true }) // 'foo'
 * ```
 */
export function prev<T, K extends keyof T>(
  current: T,
  array: T[],
  options?: {
    /**
     * The property to compare when the `array` items are objects.
     */
    prop?: K

    /**
     * Whether to loop back from the last item if the previous item exceeds the `array` bounds.
     *
     * @default false
     */
    loop?: boolean

    /**
     * Whether to return the first `array` item if the `current` item cannot be found.
     *
     * @default true
     */
    fallback?: boolean
  },
): T | undefined {
  const prop = options?.prop
  const index = prop ? array.findIndex((_current) => _current[prop] === current[prop]) : array.indexOf(current)

  if (index === -1) {
    return options?.fallback ? array[0] : undefined
  }

  return options?.loop ? nth(array, index - 1) : (array[index - 1] ?? array[0])
}

/**
 * Retrieves the item that follows the `current` item in the given `array`.
 *
 * Additional options can be provided using the `options` parameter:
 *
 * - `prop` - The property to compare when the `array` items are objects (default: `undefined`).
 * - `loop` - Whether to loop back from the first item if the next item exceeds the `array` bounds (default: `false`).
 * - `fallback` - Whether to return the first `array` item if the `current` item cannot be found (default: `false`).
 *
 * @example
 * ```ts
 * // Array of strings
 * next('bar', ['foo', 'bar', 'baz']) // 'baz'
 *
 * // Array of objects
 * next({ id: 2 }, [{ id: 1 }, { id: 2 }, { id: 3 }], { prop: 'id' }) // { id: 3 }
 *
 * // Without loop (default)
 * next('bar', ['foo', 'bar']) // 'bar'
 *
 * // With loop
 * next('bar', ['foo', 'bar'], { loop: true }) // 'foo'
 *
 * // Without fallback (default)
 * next('baz', ['foo', 'bar']) // undefined
 *
 * // With fallback
 * next('baz', ['foo', 'bar'], { fallback: true }) // 'foo'
 * ```
 */
export function next<T, K extends keyof T>(
  current: T,
  array: T[],
  options?: {
    /**
     * The property to compare when the `array` items are objects.
     */
    prop?: K

    /**
     * Whether to loop back from the first item if the next item exceeds the `array` bounds.
     *
     * @default false
     */
    loop?: boolean

    /**
     * Whether to return the first `array` item if the `current` item cannot be found.
     *
     * @default true
     */
    fallback?: boolean
  },
): T | undefined {
  const prop = options?.prop
  const index = prop ? array.findIndex((_current) => _current[prop] === current[prop]) : array.indexOf(current)

  if (index === -1) {
    return options?.fallback ? array[0] : undefined
  }

  return options?.loop ? nth(array, index + 1) : (array[index + 1] ?? last(array))
}

/**
 * Retrieves the last item of a non-empty array.
 *
 * @example
 * ```ts
 * last(['foo', 'bar', 'baz']) // 'baz'
 * last([])                    // undefined
 * ```
 */
export function last<T>(array: T[]): T | undefined {
  return array[array.length - 1]
}

/**
 * Moves an `item` in an `array` by a specified `offset`.
 *
 * @example
 * ```ts
 * move('foo', ['foo', 'bar', 'baz'], 1)  // ['bar', 'foo', 'baz']
 * move('bar', ['foo', 'bar', 'baz'], -1) // ['bar', 'foo', 'baz']
 * move('foo', ['foo', 'bar', 'baz'], -1) // ['foo', 'bar', 'baz']
 * ```
 */
export function move<T>(item: T, array: T[], offset: number): T[] {
  const index = array.indexOf(item)
  const newIndex = clamp(index + offset, 0, array.length - 1)

  if (newIndex !== index) {
    array.splice(index, 1)
    array.splice(newIndex, 0, item)
  }

  return array
}

/**
 * Moves an `item` in an `array` by a specified `offset` based on a `prop`.
 *
 * @example
 * ```ts
 * moveByProp({ id: 1 }, [{ id: 1 }, { id: 2 }], 'id', 1)  // [{ id: 2 }, { id: 1 }]
 * moveByProp({ id: 2 }, [{ id: 1 }, { id: 2 }], 'id', -1) // [{ id: 2 }, { id: 1 }]
 * moveByProp({ id: 1 }, [{ id: 1 }, { id: 2 }], 'id', -1) // [{ id: 1 }, { id: 2 }]
 * ```
 */
export function moveByProp<T, K extends keyof T>(item: T, array: T[], prop: K, offset: number): T[] {
  const index = array.findIndex((_item) => _item[prop] === item[prop])
  const newIndex = clamp(index + offset, 0, array.length - 1)

  if (newIndex !== index) {
    array.splice(index, 1)
    array.splice(newIndex, 0, item)
  }

  return array
}

/**
 * Searches for items in an array based on provided keywords.
 * The search is case-insensitive and supports partial matches.
 *
 * @param array    The array to search.
 * @param keywords The keywords to search for.
 *                 If a string is provided, it will be split into keywords.
 *                 If an array is provided, it will be used as is.
 * @param props    If provided, search will be performed on the specified properties of the items in the array, and items must be objects.
 *                 If not provided, items themselves are treated as strings.
 *
 * @returns an array of items sorted by relevance.
 *          Relevance is calculated based on the number of occurrences of the keywords in the item/property and the position of the first occurrence.
 *
 * @example
 * ```ts
 * searchByKeywords(['foo', 'bar'], 'FOO') // ['foo']
 * searchByKeywords([{ foo: 'foo' }, { foo: 'bar' }], 'FOO', 'foo') // [{ foo: 'foo' }]
 * ```
 */
export function searchByKeywords<T>(array: T[], keywords: string | string[], props?: string | string[]): T[] {
  const extractedKeywords = (isString(keywords) ? extractKeywords(keywords) : keywords).map((keyword) =>
    keyword.toLowerCase(),
  )

  return array
    .map((item) => {
      let value = ''
      let score = 0

      if (isString(props)) {
        value = getProperty<string>(item as any, props).toLowerCase()
      } else if (isArray(props)) {
        value = props
          .map((prop) => getProperty<string>(item as any, prop))
          .join(' ')
          .toLowerCase()
      } else {
        value = item as string
      }

      if (extractedKeywords.length) {
        for (const keyword of extractedKeywords) {
          const index = value.indexOf(keyword)

          if (index === -1) {
            score = 0
            break
          } else {
            score += keyword.length / (index + 1)
          }
        }
      } else {
        score = 0.1
      }

      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
}

/**
 * Sorts an `array` in natural order.
 *
 * @example
 * ```ts
 * sortNaturally(['11', '1']) // ['1', '11']
 * ```
 */
export function sortNaturally(array: string[]): string[] {
  return array.sort((a, b) => collator.compare(a, b))
}

/**
 * Sorts an `array` in natural order by a `prop`.
 *
 * @example
 * ```ts
 * sortNaturally([{ foo: '11' }, { foo: '1' }]) // [{ foo: '1' }, { foo: '11' }]
 * ```
 */
export function sortNaturallyByProp<
  T extends { [prop: string]: any } & Partial<Record<K, string | undefined>>,
  K extends keyof T,
>(array: T[], prop: K): T[] {
  return array.sort((a, b) => collator.compare(a[prop] ?? '', b[prop] ?? ''))
}

/**
 * Removes duplicate values from an `array`.
 *
 * @example
 * ```ts
 * uniqueArray(['foo', 'foo', 'bar']) // ['foo', 'bar']
 * uniqueArray([{}, {}])              // [{}, {}]
 * ```
 */
export function uniqueArray<T>(array: T[], mutate = false): T[] {
  if (mutate) {
    for (let i = 0; i < array.length; i++) {
      if (array.indexOf(array[i]) !== i) {
        array.splice(i, 1)
        i--
      }
    }

    return array
  }

  return [...new Set(array)]
}

/**
 * Removes duplicate values from an `array` based on a `prop`.
 *
 * @example
 * ```ts
 * uniqueArrayByProp([{ x: 1 }, { x: 1 }, { x: 2 }], 'x') // [{ x: 1 }, { x: 2 }]
 * ```
 */
export function uniqueArrayByProp<T, K extends keyof T>(array: T[], prop: K, mutate = false): T[] {
  if (mutate) {
    for (let i = 0; i < array.length; i++) {
      if (array.findIndex((item) => item[prop] === array[i][prop]) !== i) {
        array.splice(i, 1)
        i--
      }
    }

    return array
  }

  return array.filter((item, i) => array.findIndex((_item) => _item[prop] === item[prop]) === i)
}

/**
 * Removes all items from an `array`.
 *
 * @example
 * ```ts
 * const array = [1, 2, 3]
 * clearArray(array)
 * console.log(array) // []
 * ```
 */
export function clearArray<T>(array: T[]): T[] {
  array.splice(0, array.length)
  return array
}
