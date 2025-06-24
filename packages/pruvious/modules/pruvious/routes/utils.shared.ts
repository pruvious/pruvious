import type { LanguageCode } from '#pruvious/server'
import { isArray, withLeadingSlash, withoutTrailingSlash } from '@pruvious/utils'

/**
 * Creates a route path from the provided `path` and optionally prefixes it with a `language` code.
 *
 * The `path` can be a string or an array of subpaths.
 * It is normalized to ensure it starts with a `/` and does not end with a `/`.
 *
 * If `language` is provided, the path will be prefixed with the `language` code unless:
 *
 * - The `language` is the primary language (`pruvious.i18n.primaryLanguage`) AND
 * - Primary language prefixing is disabled (`pruvious.i18n.prefixPrimaryLanguage` is `false`)
 *
 * @example
 * ```ts
 * // languages: ['en', 'de', 'fr']
 * // primaryLanguage: 'en'
 * // prefixPrimaryLanguage: false
 * createRoutePath('/contact')       // '/contact'
 * createRoutePath('/kontakt', 'de') // '/de/kontakt'
 * createRoutePath('/contact', 'fr') // '/fr/contact'
 *
 * // languages: ['en', 'de', 'fr']
 * // primaryLanguage: 'de'
 * // prefixPrimaryLanguage: true
 * createRoutePath('/kontakt')       // '/de/kontakt'
 * createRoutePath('/contact', 'en') // '/en/contact'
 * createRoutePath('/contact', 'fr') // '/fr/contact'
 * ```
 */
export function resolvePath(path: string | string[], language?: LanguageCode): string {
  const { primaryLanguage, prefixPrimaryLanguage } = useRuntimeConfig().public.pruvious
  const pathString = isArray(path) ? path.join('/') : path
  const normalizedPath = withLeadingSlash(withoutTrailingSlash(pathString.replace(/\s+/g, '-').replace(/\/+/g, '/')))
  const resolvedLanguage = language ?? primaryLanguage
  const shouldPrefix = resolvedLanguage !== primaryLanguage || prefixPrimaryLanguage
  return shouldPrefix ? `/${resolvedLanguage}${normalizedPath}` : normalizedPath
}
