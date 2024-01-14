import { toArray as _toArray, uniq, type Arrayable, type Nullable } from '@antfu/utils'
import { clearObject, getProperty } from './object'
import { extractKeywords, isString } from './string'

export const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/**
 * Remove all elements from an `array`.
 *
 * @example
 * ```typescript
 * clearArray(['foo']) // []
 * ```
 */
export function clearArray<T>(array: T[]): T[] {
  return clearObject(array)
}

/**
 * Check if two arrays have identical unique values.
 *
 * @example
 * ```typescript
 * compareArrays(['foo', 'foo', 'bar'], ['bar', 'foo']) // true
 * ```
 */
export function compareArrays(array1: any[], array2: any[]): boolean {
  const l1 = uniq(array1).length
  const l2 = uniq(array2).length
  return l1 === l2 && l1 === intersectArrays(array1, array2).length
}

/**
 * Get the unique difference between two arrays.
 *
 * @example
 * ```typescript
 * diffArrays(['foo'], ['bar', 'bar']) // ['foo', 'bar']
 * ```
 */
export function diffArrays<T>(array1: T[], array2: T[]): T[] {
  return uniq(array1.filter((item) => !array2.includes(item)).concat(array2.filter((item) => !array1.includes(item))))
}

/**
 * Compute the intersection of two arrays. Duplicated values are removed from the returned array.
 *
 * @example
 * ```typescript
 * intersectArrays(['foo', 'foo', 'bar'], ['foo', 'foo']) // ['foo']
 * ```
 */
export function intersectArrays<T>(array1: T[], array2: T[]): T[] {
  return uniq(array1.filter((value) => array2.includes(value)))
}

/**
 * Check if a `value` is an array.
 *
 * @example
 * ```typescript
 * isObject([])   // true
 * isObject({})   // false
 * isObject(null) // false
 * ```
 */
export function isArray(array: any): array is any[] {
  return Array.isArray(array)
}

/**
 * Get the last element of a non-empty array.
 *
 * @example
 * ```typescript
 * last(['foo', 'bar', 'baz']) // 'baz'
 * ```
 */
export function last<T>(array: T[]): T {
  return array[array.length - 1]
}

/**
 * Search for items in an array based on provided keywords.
 *
 * @param array The array to search.
 * @param keywords The keywords to search for. If a string is provided, it will be split into keywords. If an array is provided, it will be used as is.
 * @param props If provided, search will be performed on the specified properties of the items in the array, and items must be objects. If not provided, items themselves are treated as strings.
 *
 * @returns An array of items sorted by relevance. Relevance is calculated based on the number of occurrences of the keywords in the item/property and the position of the first occurrence.
 *
 * @example
 * ```typescript
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
 * Sort an `array` in natural order.
 *
 * @example
 * ```typescript
 * sortNatural(['11', '1']) // ['1', '11']
 * ```
 */
export function sortNatural(array: string[]): string[] {
  return array.sort((a, b) => collator.compare(a, b))
}

/**
 * Sort an `array` in natural order by a `prop`.
 *
 * @example
 * ```typescript
 * sortNatural([{ foo: '11' }, { foo: '1' }]) // [{ foo: '1' }, { foo: '11' }]
 * ```
 */
export function sortNaturalByProp<
  T extends { [prop: string]: any } & Partial<Record<K, string | undefined>>,
  K extends keyof T,
>(array: T[], prop: K): T[] {
  return array.sort((a, b) => collator.compare(a[prop] ?? '', b[prop] ?? ''))
}

/**
 * Convert `Arrayable<T>` to `Array<T>`.
 *
 * @example
 * ```typescript
 * toArray('foo') // ['foo']
 * ```
 */
export const toArray: <T>(array?: Nullable<Arrayable<T>>) => Array<T> = _toArray

/**
 * Get the element after `el` in an `array`.
 *
 * @example
 * ```typescript
 * next('foo', ['foo', 'bar']) // 'bar'
 * ```
 */
export function next<T, K extends keyof T>(el: T, array: T[], prop?: K): T | undefined {
  const index = prop ? array.findIndex((_el) => _el[prop] === el[prop]) : array.indexOf(el)
  return index === -1 ? array[0] : nth(array, index + 1)
}

/**
 * Get the element at index `n` of an `array`. If `n` is negative, the nth element from the end is returned.
 *
 * @example
 * ```typescript
 * nth(['foo', 'bar'], 2) // 'foo'
 * ```
 */
export function nth<T>(array: T[], n: number): T {
  return array[nthIndex(array, n)]
}

/**
 * Get the normalized index at index `n` of an `array`. If `n` is negative, the nth normalized index from the end is returned.
 *
 * @example
 * ```typescript
 * nth(['foo', 'bar'], 2) // 0
 * ```
 */
export function nthIndex<T>(array: T[], n: number): number {
  n = n % array.length
  n += n < 0 ? array.length : 0

  return n
}

/**
 * Get the element before `el` in an `array`.
 *
 * @example
 * ```typescript
 * prev('bar', ['foo', 'bar']) // 'foo'
 * ```
 */
export function prev<T, K extends keyof T>(el: T, array: T[], prop?: K): T | undefined {
  const index = prop ? array.findIndex((_el) => _el[prop] === el[prop]) : array.indexOf(el)
  return index === -1 ? last(array) : nth(array, index - 1)
}

/**
 * Remove duplicate values from an `array`.
 *
 * Note: This function does not mutate the input `array`.
 *
 * @example
 * ```typescript
 * uniqueArray(['foo', 'foo', 'bar']) // ['foo', 'bar']
 * uniqueArray([{}, {}]) // [{}, {}]
 * ```
 */
export const uniqueArray: <T>(array: T[]) => T[] = uniq
