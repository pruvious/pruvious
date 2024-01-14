/**
 * Generates a union type of literal strings from the provided array of `values`.
 * This function is designed for dynamic TypeScript type creation.
 *
 * @example
 * ```typescript
 * unifyLiteralStrings('foo', 'bar') // "'bar' | 'foo'"
 * unifyLiteralStrings() // 'never'
 * ```
 */
export function unifyLiteralStrings(...values: string[]): string {
  return values.length
    ? values
        .sort()
        .map((v) => `'${v.replaceAll("'", "\\'")}'`)
        .join(' | ')
    : 'never'
}

/**
 * Generates a union type of literals from the provided array of `values`.
 * This function is designed for dynamic TypeScript type creation.
 *
 * @example
 * ```typescript
 * unifyLiterals('string', 'number') // 'number | string'
 * unifyLiterals() // 'never'
 * ```
 */
export function unifyLiterals(...values: (boolean | number | string)[]): string {
  return values.length ? values.sort().join(' | ') : 'never'
}
