import { customAlphabet } from 'nanoid'
export { nanoid } from 'nanoid'

let _randomIdentifier: ((size?: number) => string) | undefined
let _randomString: ((size?: number) => string) | undefined

/**
 * Generates a unique identifier using the [`nanoid`](https://www.npmjs.com/package/nanoid) library.
 * The identifier is 23 characters long and contains only letters (uppercase and lowercase).
 *
 * @param length The length of the identifier (default: 23).
 *
 * @example
 * ```ts
 * randomIdentifier() // 'aBcDeFgHiJkLmNoPqRsTuVw'
 * ```
 */
export function randomIdentifier(length = 23) {
  if (!_randomIdentifier) {
    _randomIdentifier = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
  }

  return _randomIdentifier(length)
}

/**
 * Generates a unique identifier using the [`nanoid`](https://www.npmjs.com/package/nanoid) library.
 * The identifier is 23 characters long and contains letters (uppercase and lowercase) and numbers.
 *
 * @param length The length of the identifier (default: 23).
 *
 * @example
 * ```ts
 * randomString() // '4KRhkhoxpU2hPDvmVf4zWD9'
 * ```
 */
export function randomString(length = 23) {
  if (!_randomString) {
    _randomString = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')
  }

  return _randomString(length)
}
