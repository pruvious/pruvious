import { isString as _isString } from '@antfu/utils'
import {
  camelCase as _camelCase,
  kebabCase as _kebabCase,
  pascalCase as _pascalCase,
  snakeCase as _snakeCase,
} from 'scule'
import { cleanDoubleSlashes, joinURL, withoutTrailingSlash } from 'ufo'
import { isNull, isUndefined } from './common'
import { isNumber } from './number'
import { isObject } from './object'

/**
 * Convert a `value` string to camel case.
 *
 * @example
 * ```typescript
 * camelCase('foo-bar') // 'fooBar'
 * ```
 */
export function camelCase(value: string): string {
  return _camelCase(value)
}

/**
 * Uppercase the first letter of a string `value`.
 *
 * @example
 * ```typescript
 * capitalize('foo')            // 'Foo'
 * capitalize('foo Bar')        // 'Foo bar'
 * capitalize('foo Bar', false) // 'Foo Bar'
 * ```
 */
export function capitalize(value: string, lowercaseRest = true): string {
  return (value[0]?.toUpperCase() ?? '') + (lowercaseRest ? value.slice(1)?.toLowerCase() ?? '' : value.slice(1))
}

/**
 * Extract keywords from a given `value` by splitting and lowercasing them into separate words.
 *
 * @example
 * ```typescript
 * extractKeywords('foo bar')    // ['foo', 'bar']
 * extractKeywords(' Foo  BAR ') // ['foo', 'bar']
 * ```
 */
export function extractKeywords(value: string): string[] {
  return value
    .toLowerCase()
    .split(' ')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

/**
 * Check whether a given `character` is alphanumeric (either a letter or a digit).
 *
 * @example
 * ```typescript
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
 * Check if a string `value` consist of alphanumeric characters where each word starts with an uppercase letter
 * and has no spaces or special characters.
 *
 * @example
 * ```typescript
 * isPascalCase('Foo')    // true
 * isPascalCase('FooBar') // true
 * isPascalCase('foo')    // false
 * isPascalCase('fooBar') // false
 * isPascalCase('123')    // false
 * ```
 */
export function isPascalCase(value: any): boolean {
  return isString(value) && /^(?:[A-Z][a-z0-9]*)+$/.test(value)
}

/**
 * Check if a string `value` contains only lowercase alphanumeric characters and hyphens.
 *
 * Additionally, ensure that it begins with a letter, ends with an alphanumeric character,
 * and does not contain two consecutive hyphens.
 *
 * @example
 * ```typescript
 * isSafeSlug('foo')     // true
 * isSafeSlug('foo-bar') // true
 * isSafeSlug('Foo')     // false
 * isSafeSlug('fooBar')  // false
 * isSafeSlug('123')     // false
 * ```
 */
export function isSafeSlug(value: any): boolean {
  return isString(value) && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
}

/**
 * Check if a string `value` contains only lowercase alphanumeric characters and hyphens.
 *
 * Additionally, ensure that it starts and ends with an alphanumeric character,
 * and does not contain two consecutive hyphens.
 *
 * @example
 * ```typescript
 * isSlug('foo')     // true
 * isSlug('foo-bar') // true
 * isSlug('123')     // true
 * isSlug('Foo')     // false
 * isSlug('fooBar')  // false
 * ```
 */
export function isSlug(value: any): boolean {
  return isString(value) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

/**
 * Check if a `value` is a string.
 *
 * @example
 * ```typescript
 * isString('') // true
 * isString(1)  // false
 * ```
 */
export const isString: (value: any) => value is string = _isString

/**
 * Check if a string `value` is a valid URL.
 *
 * @example
 * isUrl('http://foo.bar') // true
 * isUrl('foo.bar')        // false
 */
export function isUrl(value: string): boolean {
  try {
    return new URL(value).href.replace(/\/$/, '') === value.replace(/\/$/, '')
  } catch {
    return false
  }
}

/**
 * Check if a string `value` is a valid URL pathname.
 * If `allowRelative` is `true`, also allow relative paths.
 *
 * @example
 * ```typescript
 * isUrlPath('/foo')      // true
 * isUrlPath('foo')       // false
 * isUrlPath('foo', true) // true
 * ```
 */
export function isUrlPath(value: string, allowRelative: boolean = false): boolean {
  try {
    const url = new URL(value, 'http://__pruvious')

    return !value.includes('//') && (url.pathname === value || (allowRelative && url.pathname.slice(1) === value))
  } catch {
    return false
  }
}

/**
 * Create a normalized API route based on the given route `parts`.
 *
 * @example
 * ```typescript
 * joinRouteParts('foo', 'bar') // '/foo/bar'
 * joinRouteParts('/foo/', '', 'bar/') // '/foo/bar'
 * joinRouteParts('foo', 'bar//baz') // '/foo/bar/baz'
 * ```
 */
export function joinRouteParts(...parts: string[]): string {
  const parsedParts = parts.filter(Boolean).map((part) => part.replaceAll('\\', '/'))

  if (parsedParts[0]?.includes(':')) {
    parsedParts[0] = parsedParts[0].replace(/^[a-z]:[\\\/]/i, '')
  }

  return withoutTrailingSlash(cleanDoubleSlashes(joinURL('/', ...parsedParts)))
}

/**
 * Convert a `value` string to kebab case.
 *
 * @example
 * ```typescript
 * kebabCase('foo_bar') // 'foo-bar'
 * ```
 */
export function kebabCase(value: string): string {
  return _kebabCase(value)
}

/**
 * Convert a `value` string to pascal case.
 *
 * @example
 * ```typescript
 * pascalCase('foo-bar') // 'FooBar'
 * ```
 */
export function pascalCase(value: string): string {
  return _pascalCase(value)
}

/**
 * Resolve the path prefix for a given `language` for a page-like `collection`.
 */
export function resolveCollectionPathPrefix(
  collection: Record<string, any>,
  language: string,
  primaryLanguage: string,
): string {
  const pp = collection.publicPages

  return isString(pp.pathPrefix)
    ? pp.pathPrefix
    : isObject(pp.pathPrefix)
    ? pp.pathPrefix[language] ?? pp.pathPrefix[primaryLanguage] ?? ''
    : ''
}

/**
 * Create a URL path that includes the given `language`.
 *
 * @example
 * ```typescript
 * setTranslationPrefix('/foo', 'de') // '/de/foo'
 * ```
 */
export function setTranslationPrefix(path: string, language: string, supportedLanguages: string[]): string {
  const parts = path.split('/').filter(Boolean)

  if (parts[0] && supportedLanguages.includes(parts[0])) {
    parts.shift()
  }

  return joinRouteParts(language, ...parts)
}

/**
 * Get the translation prefix from a given `path`.
 * If the path does not contain a translation prefix, return `null`.
 *
 * @example
 * ```typescript
 * getTranslationPrefix('/de/foo', ['de', 'en']) // 'de'
 * getTranslationPrefix('/foo', ['de', 'en'])    // null
 * ```
 */
export function getTranslationPrefix(path: string, supportedLanguages: string[]): string | null {
  const parts = path.split('/').filter(Boolean)

  if (supportedLanguages.includes(parts[0])) {
    return parts[0]
  }

  return null
}

/**
 * Remove accents from a given `value`.
 *
 * @example
 * ```typescript
 * removeAccents('áéíóú') // 'aeiou'
 * ```
 */
export function removeAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('ß', 'ss')
}

/**
 * Convert a `value` string to snake case.
 *
 * @example
 * ```typescript
 * snakeCase('foo-bar') // 'foo_bar'
 * ```
 */
export function snakeCase(value: string): string {
  return _snakeCase(value)
}

/**
 * Convert a string `value` to title case.
 *
 * @example
 * ```typescript
 * titleCase('foo-bar') // 'Foo Bar'
 * titleCase('foo-bar', false) // 'Foo bar'
 * ```
 */
export function titleCase(value: any, capitalizeAll = true): string {
  if (!isString(value)) {
    return ''
  }

  return kebabCase(value)
    .split('-')
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word, i) => (i === 0 || capitalizeAll ? capitalize(word) : word))
    .join(' ')
}

/**
 * Transform a `value` to a string.
 */
export function stringify(value: any) {
  return isString(value)
    ? value
    : isNumber(value)
    ? value.toString()
    : isNull(value) || isUndefined(value)
    ? ''
    : JSON.stringify(value)
}

/**
 * Lowercase the first letter of a string `value`.
 *
 * @example
 * ```typescript
 * uncapitalize('Foo') // 'foo'
 * ```
 */
export function uncapitalize(value: string): string {
  return (value[0]?.toLowerCase() ?? '') + (value.slice(1) ?? '')
}
