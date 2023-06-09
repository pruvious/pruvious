import { clearObject } from './object'

export const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/**
 * Remove all elements from an `array`.
 *
 * @example
 * clearArray(['foo']) // []
 */
export function clearArray<T>(array: T[]): T[] {
  return clearObject(array)
}

/**
 * Check if two arrays have identical unique values.
 *
 * @example
 * compareArrays(['foo', 'foo', 'bar'], ['bar', 'foo']) // true
 */
export function compareArrays(array1: any[], array2: any[]): boolean {
  const l1 = uniqueArray(array1).length
  const l2 = uniqueArray(array2).length
  return l1 === l2 && l1 === intersectArrays(array1, array2).length
}

/**
 * Get the unique difference between two arrays.
 *
 * @example
 * diffArrays(['foo'], ['bar', 'bar']) // ['foo', 'bar']
 */
export function diffArrays<T>(array1: T[], array2: T[]): T[] {
  return uniqueArray(
    array1
      .filter((item) => !array2.includes(item))
      .concat(array2.filter((item) => !array1.includes(item))),
  )
}

/**
 * Compute the intersection of two arrays. Duplicated values are removed from
 * the returned array.
 *
 * @example
 * intersectArrays(['foo', 'foo', 'bar'], ['foo', 'foo']) // ['foo']
 */
export function intersectArrays<T>(array1: T[], array2: T[]): T[] {
  return uniqueArray(array1.filter((value) => array2.includes(value)))
}

/**
 * Get the last element of a non-empty array.
 *
 * @example
 * last(['foo', 'bar', 'baz']) // 'baz'
 */
export function last<T>(array: T[]): T {
  return array[array.length - 1]
}

/**
 * Sort an `array` in natural order.
 *
 * @example
 * sortNatural(['11', '1']) // ['1', '11']
 */
export function sortNatural(array: string[]): string[] {
  return array.sort((a, b) => collator.compare(a, b))
}

/**
 * Sort an `array` in natural order by a `prop`.
 *
 * @example
 * sortNatural([{ foo: '11' }, { foo: '1' }]) // [{ foo: '1' }, { foo: '11' }]
 */
export function sortNaturalByProp<
  T extends { [prop: string]: any } & Partial<Record<K, string | undefined>>,
  K extends keyof T,
>(array: T[], prop: K): T[] {
  return array.sort((a, b) => collator.compare(a[prop] ?? '', b[prop] ?? ''))
}

/**
 * Get the next element of `el` in an `array`.
 *
 * @example
 * next('foo', ['foo', bar']) // 'bar'
 */
export function next<T, K extends keyof T>(el: T, array: T[], prop?: K): T | undefined {
  const index = prop ? array.findIndex((_el) => _el[prop] === el[prop]) : array.indexOf(el)
  return index === -1 ? array[0] : nth(array, index + 1)
}

/**
 * Get the element at index `n` of an `array`. If `n` is negative, the nth element
 * from the end is returned.
 *
 * @example
 * nth(['foo', bar'], 2) // 'foo'
 */
export function nth<T>(array: T[], n: number): T {
  return array[nthIndex(array, n)]
}

/**
 * Get the normalized index at index `n` of an `array`. If `n` is negative, the nth normalized
 * index from the end is returned.
 *
 * @example
 * nth(['foo', bar'], 2) // 0
 */
export function nthIndex<T>(array: T[], n: number): number {
  n = n % array.length
  n += n < 0 ? array.length : 0

  return n
}

/**
 * Get the previous element of `el` in an `array`.
 *
 * @example
 * prev('bar', ['foo', bar']) // 'foo'
 */
export function prev<T, K extends keyof T>(el: T, array: T[], prop?: K): T | undefined {
  const index = prop ? array.findIndex((_el) => _el[prop] === el[prop]) : array.indexOf(el)
  return index === -1 ? last(array) : nth(array, index - 1)
}

/**
 * Remove duplicate values from an `array`.
 *
 * @example
 * uniqueArray(['foo', 'foo', 'bar']) // ['foo', 'bar']
 */
export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)]
}
