import {
  prefixPrimaryLanguage,
  primaryLanguage,
  supportedLanguages,
  type CollectionName,
  type SupportedLanguage,
} from '#pruvious'
import { collections } from '#pruvious/collections'
import { isString, joinRouteParts, resolveCollectionPathPrefix } from '../../utils/string'

/**
 * Resolve the final URL path for a page-like collection record.
 *
 * This utility does the following:
 *
 * - It adds the language prefix to the URL path respecting the `language.prefixPrimary` module option.
 * - If the language code is not supported or not provided, it uses the primary language.
 * - It resolves the `publicPages.pathPrefix` option of the collection and adds the corresponding prefix to the URL path.
 * - It appends the `path` value to the resolved prefixes.
 * - It ensures that the URL path is normalized and does not contain any double slashes.
 *
 * @example
 * ```typescript
 * import { query, resolveLanguage, resolvePagePath } from '#pruvious/server'
 *
 * export default defineEventHandler(async (event) => {
 *   const language = resolveLanguage(getQuery(event).language)
 *   const articles = await query('articles')
 *     .select(['path'])
 *     .where('language', language)
 *     .all()
 *
 *   return Promise.all(
 *     articles.map(async ({ path }) => {
 *       return await resolvePagePath(path, 'articles', language)
 *     }),
 *   )
 * })
 * ```
 */
export async function resolvePagePath(path: string, collectionName: CollectionName, language?: any): Promise<string> {
  const collection = collections[collectionName]
  const resolvedLanguage = resolveLanguage(language)
  const languagePrefix = resolvedLanguage === primaryLanguage && !prefixPrimaryLanguage ? '' : resolvedLanguage
  const collectionPrefix = resolveCollectionPathPrefix(collection, resolvedLanguage, primaryLanguage)

  return joinRouteParts(languagePrefix, collectionPrefix, path)
}

/**
 * Resolve the language from the provided `input` value.
 *
 * If the `input` is a string and it is a supported language code, it returns the `input` value.
 * Otherwise, it returns the primary language code.
 *
 * @example
 * ```typescript
 * import { resolveLanguage } from '#pruvious/server'
 *
 * export default defineEventHandler(async (event) => {
 *   const language = getQuery(event).language // Or any other way to get the language
 *   const resolvedLanguage = resolveLanguage(language)
 * })
 * ```
 */
export function resolveLanguage(input: any): SupportedLanguage {
  return isString(input as SupportedLanguage) && supportedLanguages.includes(input) ? input : primaryLanguage
}
