/**
 * Splits a `string` by a casing pattern and join it with a custom function.
 *
 * @example
 * ```ts
 * normalizeCase('foo-bar', ({ curr }) => curr.toUpperCase()) // 'FooBar'
 * ```
 */
export function normalizeCase(
  string: string,
  fn: (context: { curr: string; prev: string | undefined; index: number }) => string,
) {
  let result = ''
  let split = false
  let index = 0
  let prev: string | undefined = undefined

  for (const curr of string.trim()) {
    if ((curr >= '0' && curr <= '9') || (curr >= 'a' && curr <= 'z')) {
      result += split || !index ? fn({ curr, prev, index }) : curr
      split = false
      index++
    } else if (curr >= 'A' && curr <= 'Z') {
      result += fn({ curr, prev, index })
      split = false
      index++
    } else {
      split = true
    }

    prev = curr
  }

  return result
}

/**
 * Converts a `string` to camelCase.
 *
 * @example
 * ```ts
 * camelCase('foo-bar') // 'fooBar'
 * camelCase('fooBAR')  // 'fooBAR'
 * ```
 */
export function camelCase(string: string) {
  return normalizeCase(string, ({ curr, prev, index }) => {
    if (index && (prev! < 'A' || prev! > 'Z')) {
      return `-${curr}`
    }

    return curr
  })
    .split('-')
    .map((word, index) => (index ? (word.toUpperCase() === word ? word : capitalize(word)) : word.toLowerCase()))
    .join('')
}

/**
 * Converts a `string` to kebab-case.
 *
 * @example
 * ```ts
 * kebabCase('fooBar') // 'foo-bar'
 * kebabCase('fooBAR') // 'foo-bar'
 * ```
 */
export function kebabCase(string: string) {
  return normalizeCase(string, ({ curr, prev, index }) => {
    if (index && (prev! < 'A' || prev! > 'Z')) {
      return `-${curr}`
    }

    return curr
  }).toLowerCase()
}

/**
 * Converts a `string` to PascalCase.
 *
 * @example
 * ```ts
 * pascalCase('foo-bar') // 'FooBar'
 * pascalCase('fooBAR')  // 'FooBAR'
 * ```
 */
export function pascalCase(string: string) {
  return normalizeCase(string, ({ curr }) => curr.toUpperCase())
}

/**
 * Converts a `string` to snake_case.
 *
 * @example
 * ```ts
 * snakeCase('fooBar') // 'foo_bar'
 * snakeCase('fooBAR') // 'foo_bar'
 * ```
 */
export function snakeCase(string: string) {
  return normalizeCase(string, ({ curr, prev, index }) => {
    if (index && (prev! < 'A' || prev! > 'Z')) {
      return `_${curr}`
    }

    return curr
  }).toLowerCase()
}

/**
 * Converts a `string` to Title Case.
 *
 * By default, all words are capitalized.
 * Set `capitalizeAll` to `false` to only capitalize the first word.
 *
 * @example
 * ```ts
 * titleCase('foo-bar')        // 'Foo Bar'
 * titleCase('foo-bar', false) // 'Foo bar'
 * titleCase('fooBAR')         // 'Foo BAR'
 * ```
 */
export function titleCase(string: string, capitalizeAll = true): string {
  return kebabCase(string)
    .split('-')
    .map((word, i) => (i === 0 || capitalizeAll ? capitalize(word) : word))
    .join(' ')
}

/**
 * Capitalizes the first character of a `string`.
 * By default, it also converts the rest of the string to lowercase.
 *
 * @example
 * ```ts
 * capitalize('foo')            // 'Foo'
 * capitalize('foo Bar')        // 'Foo bar'
 * capitalize('foo Bar', false) // 'Foo Bar'
 * ```
 */
export function capitalize(string: string, lowercaseRest = true): string {
  return (string[0]?.toUpperCase() ?? '') + (lowercaseRest ? (string.slice(1)?.toLowerCase() ?? '') : string.slice(1))
}
