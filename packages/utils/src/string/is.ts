/**
 * Checks if a single `character` is a valid alphanumeric string (A-Z, a-z, 0-9).
 *
 * @example
 * ```ts
 * isAlphanumeric('A') // true
 * isAlphanumeric('1') // true
 * isAlphanumeric('?') // false
 * ```
 */
export function isAlphanumeric(character: string): boolean {
  const code = character.charCodeAt(0)

  return (
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    (code >= 48 && code <= 57) // 0-9
  )
}

/**
 * Checks if a `value` is a valid Schemau identifier.
 *
 * @example
 * ```ts
 * isIdentifier('fooBar')  // true
 * isIdentifier('foo_bar') // true
 * isIdentifier('foo-bar') // false
 * isIdentifier('$fooBar') // false
 * ```
 */
export function isIdentifier(value: unknown): value is string {
  return isString(value) && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)
}

/**
 * Checks if a `value` is a numeric string.
 *
 * @example
 * ```ts
 * isNumericString('1')   // true
 * isNumericString('1.5') // true
 * isNumericString('foo') // false
 * isNumericString(1)     // false
 * ```
 */
export function isNumericString(value: unknown): value is string {
  if (isString(value)) {
    const parts = value.split('.')

    return (
      parts.length <= 2 &&
      /^-?(?:0|[1-9][0-9]*)$/.test(parts[0]) &&
      (parts.length === 1 || /^[0-9]*[1-9]$/.test(parts[1]))
    )
  }

  return false
}

/**
 * Checks if a `value` is a slug.
 *
 * @example
 * ```ts
 * isSlug('hello-world') // true
 * isSlug('hello_world') // false
 * isSlug('Hello-World') // false
 * ```
 */
export function isSlug(value: unknown): value is string {
  return isString(value) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

/**
 * Checks if a `value` is a string.
 *
 * @example
 * ```ts
 * isString('') // true
 * isString(1)  // false
 * ```
 */
export function isString(value: any): value is string {
  return typeof value === 'string'
}

/**
 * Checks if a `value` is a stringified integer.
 *
 * @example
 * ```ts
 * isStringInteger('1')   // true
 * isStringInteger('0')   // true
 * isStringInteger('-1')  // true
 * isStringInteger('1.5') // false
 * isStringInteger(1)     // false
 * ```
 */
export function isStringInteger(value: unknown): value is string {
  return isString(value) && /^-?(?:0|[1-9][0-9]*)$/.test(value)
}
