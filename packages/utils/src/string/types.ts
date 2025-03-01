/**
 * Omits characters from a string.
 *
 * @example
 * ```ts
 * type T0 = OmitCharacters<'foo bar', ' '> // 'foobar'
 * ```
 */
export type OmitCharacters<S extends string, C extends string> = S extends `${infer L}${C}${infer R}`
  ? OmitCharacters<`${L}${R}`, C>
  : S

/**
 * Checks if a string has a character.
 *
 * @example
 * ```ts
 * type T0 = HasCharacter<'foo bar', ' '> // true
 * type T1 = HasCharacter<'foobar', ' '>  // false
 * ```
 */
export type HasCharacter<T extends string, U extends string> = T extends `${infer S}${infer R}`
  ? S extends U
    ? true
    : HasCharacter<R, U>
  : false
