import { murmurHash } from 'ohash'

/**
 * Truncates a `string` to a specified `length` and append a unique hash to ensure uniqueness.
 * If the `string` is shorter than the `length`, it will be returned as is.
 * The `separator` (default: `_`) is used to separate the truncated `string` and the hash.
 *
 * **Note:** The hash is generated using the [`murmurHash`](https://www.npmjs.com/package/ohash) function.
 * The `length` should be at least 10 characters to ensure uniqueness.
 *
 * @example
 * ```ts
 * uniqueTrim('Hello World', 10) // Hello Wor_2708020327
 * ```
 */
export function uniqueTrim(string: string, length: number, separator = '_') {
  if (string.length <= length) {
    return string
  }

  const hash = String(murmurHash(string))
  const sliceEnd = Math.max(0, length - hash.length - separator.length)

  return (string.slice(0, sliceEnd) + (sliceEnd ? separator + hash : hash)).slice(0, length)
}
