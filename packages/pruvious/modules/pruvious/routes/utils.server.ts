import {
  collections,
  getRouteReferences,
  hasPermission,
  selectFrom,
  selectSingleton,
  type Collections,
  type LanguageCode,
  type RouteReferenceName,
  type RouteReferences,
  type Singletons,
} from '#pruvious/server'
import type { ExtractCastedTypes, ExtractPopulatedTypes, GenericField } from '@pruvious/orm'
import {
  buildRelURL,
  isDefined,
  isNotNull,
  isNull,
  isPositiveInteger,
  isRelURL,
  parseRelURL,
  pick,
  withLeadingSlash,
  withoutTrailingSlash,
  withTrailingSlash,
  type ParsedRelURL,
} from '@pruvious/utils'
import type { LayoutKey } from 'nuxt/app'
import { getLinkIndex, getRecordTranslations, resolveRelURLFromIndex, type LinkIndexRoute } from './link-index.server'

export interface GenericRouteReference {
  /**
   * Indicates whether the reference is a collection or singleton.
   */
  dataContainerType: 'collection' | 'singleton'

  /**
   * The name of the collection or singleton.
   */
  dataContainerName: keyof Collections | keyof Singletons

  /**
   * A key-value object of `Field` instances representing the `routing.publicFields` of the collection or singleton.
   */
  publicFields: Record<string, GenericField>

  /**
   * The layout key used to render the collection's route.
   * Defines which Vue component will be used in `<NuxtLayout>` when displaying this collection.
   */
  layout?: LayoutKey
}

export interface GenericRouteData {
  /**
   * The collection or singleton name that this route belongs to.
   * If they share the same name, the singleton will be suffixed with `:Singleton`.
   */
  $ref: string

  /**
   * The `routing.publicFields` values of the referenced collection or singleton.
   */
  $data: Record<string, any>
}

export interface ResolvedRouteSEO {
  /**
   * The final page title displayed in search results and browser tabs.
   * Combines settings from both the collection and SEO singleton.
   */
  title: string

  /**
   * A brief description of the page content, typically displayed in search results.
   */
  description: string

  /**
   * The full URL of the page, used for canonical links and sharing.
   * This is the absolute URL including the protocol and domain.
   */
  url: string

  /**
   * Indicates whether the route is indexable by search engines.
   */
  isIndexable: boolean
}

export type ResolvedRoute<TRef extends RouteReferenceName = RouteReferenceName> = {
  /**
   * The language code of the current route.
   */
  language: LanguageCode

  /**
   * The translations for the current route.
   *
   * - Keys are language codes.
   * - Values are full route paths of translations (or `null` if translation doesn't exist).
   */
  translations: Record<LanguageCode, string | null>

  /**
   * The resolved SEO data for the route.
   */
  seo: ResolvedRouteSEO

  /**
   * The collection or singleton name that this route belongs to.
   * If they share the same name, the singleton will be suffixed with `:Singleton`.
   */
  ref: TRef

  /**
   * The `routing.publicFields` values of the referenced collection or singleton.
   */
  data: ExtractPopulatedTypes<RouteReferences[TRef]['publicFields']> & {
    _casted?: ExtractCastedTypes<RouteReferences[TRef]['publicFields']>
  }

  /**
   * The layout key used to render the collection's route.
   * Defines which Vue component will be used in `<NuxtLayout>` when displaying this collection.
   */
  layout?: LayoutKey

  /**
   * Optional path for a 302 redirect that standardizes the letter case in the route path.
   */
  softRedirect?: string
}

export interface RouteRedirect {
  /**
   * The URL to redirect to.
   * It can be an absolute URL or a relative path.
   */
  to: string

  /**
   * The HTTP status code for the redirect.
   * Use `301` for permanent redirects or `302` for temporary redirects.
   */
  code: 301 | 302

  /**
   * Indicates whether to forward query parameters from the current URL to the redirect URL.
   */
  forwardQueryParams: boolean
}

export interface RouteRedirect {
  /**
   * The URL to redirect to.
   * It can be an absolute URL or a relative path.
   */
  to: string

  /**
   * The HTTP status code for the redirect.
   * Use `301` for permanent redirects or `302` for temporary redirects.
   */
  code: 301 | 302

  /**
   * Indicates whether to forward query parameters from the current URL to the redirect URL.
   */
  forwardQueryParams: boolean
}

export interface ListRoutesOptions {
  /**
   * The number of results per page.
   *
   * @default 50
   */
  perPage?: number

  /**
   * The current page number (1-based).
   *
   * @default 1
   */
  page?: number

  /**
   * The language(s) to list routes for.
   *
   * - A single language code returns URLs for that language only.
   * - `'all'` aggregates URLs from every configured language (each translation gets its own entry).
   * - Omitted defaults to the primary language.
   */
  language?: LanguageCode | 'all'

  /**
   * Whether to include non-public (draft) routes and records.
   *
   * @default false
   */
  includeDrafts?: boolean

  /**
   * Whether to return only routes and records marked as indexable by search engines.
   * Honors the SEO singleton master switch - when the singleton hides the site, the result is always empty.
   *
   * @default false
   */
  indexableOnly?: boolean
}

export interface ListRoutesEntry {
  /**
   * The full resolved URL path (e.g. `/blog/my-post` or `/de/blog/mein-beitrag`).
   */
  path: string

  /**
   * A map of translations for this route.
   *
   * - Keys are language codes of other configured languages.
   * - Values are full route paths of translations (or `null` if the translation doesn't exist or is not public).
   */
  translations: Record<LanguageCode, string | null>
}

export interface ListRoutesResult {
  /**
   * The listed route entries for the current page.
   */
  data: ListRoutesEntry[]

  /**
   * The current page number.
   */
  currentPage: number

  /**
   * The last page number.
   */
  lastPage: number

  /**
   * The number of results per page.
   */
  perPage: number

  /**
   * The total number of available routes across all pages.
   */
  total: number
}

/**
 * Finds and returns a route by its full URL `path`.
 *
 * @returns a `ResolvedRoute`, `RouteRedirect` object, or `null` if the route cannot be resolved.
 */
export async function resolveRoute<TRef extends RouteReferenceName>(
  path: string,
): Promise<ResolvedRoute<TRef> | RouteRedirect | null> {
  const subpaths = path.split('/').filter(Boolean)
  const { languages, primaryLanguage, prefixPrimaryLanguage } = useRuntimeConfig().pruvious.i18n
  const language = (languages.find(({ code }) => subpaths[0]?.toLowerCase() === code.toLowerCase())?.code ??
    primaryLanguage) as LanguageCode
  const languagePrefix = language !== primaryLanguage || prefixPrimaryLanguage ? `/${language}` : ''
  const languageSuffix = language.toUpperCase() as Uppercase<LanguageCode>
  const normalizedRoutePath = normalizeRoutePath(
    subpaths[0]?.toLowerCase() === language.toLowerCase() ? subpaths.slice(1).join('/') : subpaths.join('/'),
    false,
  )
  const otherLanguages = languages.filter(({ code }) => code !== language)
  const otherLanguageSuffixes = otherLanguages.map(({ code }) => code.toUpperCase() as Uppercase<LanguageCode>)
  const tryPaths: string[] = ['/']
  const routeReferences = await getRouteReferences()

  if (subpaths[0]?.toLowerCase() === language.toLowerCase()) {
    subpaths.shift()
  }

  for (let i = 1; i <= subpaths.length; i++) {
    const joined = subpaths.slice(0, i).join('/')
    tryPaths.unshift(`/${joined}`)
  }

  const routeCandidates = await Promise.all([
    selectSingleton('SEO').language(language).populate().get(),
    ...tryPaths.map(async (tryPath) => {
      const query = selectFrom('Routes').where(`path${language.toUpperCase()}` as any, 'ilike', tryPath)
      if (!hasPermission('preview-drafts')) {
        query.where(`isPublic${language.toUpperCase()}` as any, '=', true)
      }
      return query.first().then(({ data }) => data)
    }),
  ] as unknown as (ExtractPopulatedTypes<Collections['Routes']['fields']> | null)[])

  const baseSEO = (routeCandidates.shift() as any).data as ExtractPopulatedTypes<Singletons['SEO']['fields']>
  const exactRoute = routeCandidates[0]!

  for (const route of routeCandidates) {
    if (route) {
      const routePath = route[`path${languageSuffix}`]!

      for (const { match, to, code, forwardQueryParams } of route[`redirects${languageSuffix}`]) {
        let redirectTo: string | null = !match ? to : null

        if (match) {
          const matches = new RegExp(match, 'im').exec(normalizedRoutePath.slice(routePath.length))
          if (matches) {
            redirectTo = to.replace(/\$(\d+)/g, (placeholder, index) => matches[parseInt(index, 10)] ?? placeholder)
          }
        }

        if (isNotNull(redirectTo)) {
          if (redirectTo === '') {
            redirectTo = normalizeRoutePath(languagePrefix + routePath)
          } else if (redirectTo.startsWith('/')) {
            redirectTo = normalizeRoutePath(redirectTo)
          } else if (!redirectTo.startsWith('http://') && !redirectTo.startsWith('https://')) {
            redirectTo = normalizeRoutePath(`${languagePrefix}/${routePath}/${redirectTo}`)
          }

          return { to: redirectTo, code: code as 301 | 302, forwardQueryParams }
        }
      }
    }
  }

  if (exactRoute) {
    if (exactRoute.referencedSingleton) {
      const singletonReference = Object.entries(routeReferences).find(
        ([_, { dataContainerType, dataContainerName }]) =>
          dataContainerType === 'singleton' && dataContainerName === exactRoute!.referencedSingleton,
      )

      if (singletonReference) {
        const routeSEO = exactRoute[`seo${languageSuffix}`]
        const realPath = normalizeRoutePath(languagePrefix + exactRoute[`path${languageSuffix}`])

        return {
          language,
          translations: Object.fromEntries(
            otherLanguages.map(({ code }, i) => [
              code,
              isNotNull(exactRoute![`path${otherLanguageSuffixes[i]!}`]) &&
              (exactRoute![`isPublic${otherLanguageSuffixes[i]!}`] || hasPermission('preview-drafts'))
                ? normalizeRoutePath(code + exactRoute![`path${otherLanguageSuffixes[i]!}`])
                : null,
            ]),
          ) as any,
          seo: {
            title: routeSEO.title
              ? routeSEO.baseTitle
                ? baseSEO.baseTitlePosition === 'before'
                  ? baseSEO.baseTitle + baseSEO.titleSeparator + routeSEO.title
                  : routeSEO.title + baseSEO.titleSeparator + baseSEO.baseTitle
                : routeSEO.title
              : baseSEO.baseTitle,
            description: exactRoute[`seo${languageSuffix}`].description,
            url: baseSEO.baseURL + (realPath === '/' ? '' : realPath),
            isIndexable: baseSEO.isIndexable && exactRoute[`seo${languageSuffix}`].isIndexable,
          },
          ref: singletonReference[0] as TRef,
          data: (await selectSingleton(exactRoute.referencedSingleton)
            .select(Object.keys(singletonReference[1].publicFields) as any)
            .language(language)
            .get()) as any,
          layout: singletonReference[1].layout,
          softRedirect: realPath !== withLeadingSlash(path) ? realPath! : undefined,
        }
      }
    }
  }

  const collectionRecords = await Promise.all(
    routeCandidates.flatMap((route) => {
      return (route?.referencedCollections ?? []).map(async (collectionName) => {
        const collectionReference = Object.entries(routeReferences).find(
          ([_, { dataContainerType, dataContainerName }]) =>
            dataContainerType === 'collection' && dataContainerName === collectionName,
        )

        if (!collectionReference) {
          return null
        }

        const collection = collections[collectionName as keyof Collections]
        const query = selectFrom(collectionName as any)
        const select = ['id', 'subpath', ...collection.meta.routing.publicFields]
        const subpath = normalizedRoutePath.slice(withTrailingSlash(route![`path${languageSuffix}`]!).length)

        if (collection.meta.routing.isPublic.enabled && !hasPermission('preview-drafts')) {
          query.where('isPublic', '=', true)
        }

        if (collection.meta.routing.seo.enabled) {
          select.push('seo')
        }

        if (collection.meta.translatable) {
          query.where('language', '=', language)

          const whereIsPublic = (code: string) =>
            collection.meta.routing.isPublic.enabled && !hasPermission('preview-drafts')
              ? ` and "${collectionName}_${code}"."isPublic" = 1`
              : ''

          for (const { code } of languages) {
            if (code !== language) {
              select.push(
                `(select "subpath" from "${collectionName}" as "${collectionName}_${code}" where "${collectionName}_${code}"."translations" = "${collectionName}"."translations" and "language" = '${code}'${whereIsPublic(code)}) as "subpath_${code}"`,
              )
            }
          }
        }

        return query
          .selectRaw(select.join(', '))
          .where('subpath', 'ilike', subpath)
          .populate()
          .withCustomContextData({ language })
          .first()
          .then(({ data }) => ({ ref: collectionReference![0] as TRef, collection, data, route: route! }))
      })
    }),
  )

  for (const record of collectionRecords) {
    if (record?.data) {
      const { ref, collection, data, route } = record
      const basePath = route[`path${languageSuffix}`]
      const realPath = normalizeRoutePath(`${languagePrefix}/${basePath}/${data.subpath}`)
      const seo = collection.meta.routing.seo.enabled ? data.seo : {}
      const routeSEO = route[`seo${languageSuffix}`]
      const title = seo.title || routeSEO.title

      return {
        language,
        translations: Object.fromEntries(
          otherLanguages.map(({ code }) => [
            code,
            isNotNull(data[`subpath_${code}`])
              ? normalizeRoutePath(`${code}/${basePath}/${data[`subpath_${code}`]}`)
              : null,
          ]),
        ) as any,
        seo: {
          title: title
            ? (seo.baseTitle ?? routeSEO.baseTitle)
              ? baseSEO.baseTitlePosition === 'before'
                ? baseSEO.baseTitle + baseSEO.titleSeparator + title
                : title + baseSEO.titleSeparator + baseSEO.baseTitle
              : title
            : baseSEO.baseTitle,
          description: seo.description || routeSEO.description,
          url: baseSEO.baseURL + (realPath === '/' ? '' : realPath),
          isIndexable: baseSEO.isIndexable && routeSEO.isIndexable && (seo.isIndexable ?? true),
        },
        ref,
        data: pick(data, collection.meta.routing.publicFields) as any,
        layout: collection.meta.routing.layout,
        softRedirect: realPath !== withLeadingSlash(path) ? realPath : undefined,
      }
    }
  }

  return null
}

/**
 * Normalizes a route path based on various Pruvious settings from `nuxt.config.ts`.
 *
 * The `trailingSlash` parameter controls how trailing slashes are handled:
 *
 * - `'auto'` - Uses the `pruvious.routing.trailingSlash` configuration setting (default).
 * - `true` - Adds a trailing slash to the path.
 * - `false` - Removes any trailing slash from the path.
 */
export function normalizeRoutePath(path: string, trailingSlash: boolean | 'auto' = 'auto'): string {
  path = withLeadingSlash(withTrailingSlash(path.replace(/\/+/g, '/')))

  const runtimeConfig = useRuntimeConfig()
  const { primaryLanguage, prefixPrimaryLanguage } = runtimeConfig.pruvious.i18n
  const ts = trailingSlash === 'auto' ? runtimeConfig.pruvious.routing.trailingSlash : trailingSlash

  if (!prefixPrimaryLanguage && path.startsWith(`/${primaryLanguage}/`)) {
    path = path.slice(primaryLanguage.length + 1)
  }

  if (!ts && path.endsWith('/')) {
    path = withoutTrailingSlash(path)
  }

  return path || '/'
}

/**
 * Translates a `rel://` URL to the equivalent URL for the given target language.
 *
 * Returns `null` if the route or collection record has no translation in the target language.
 * The result always emits an explicit `@{language}` pin. Query strings and hash fragments are preserved.
 *
 * @example
 * ```ts
 * await translateRelURL('rel://Routes:1/Pages:5@en', 'de')
 * // 'rel://Routes:1/Pages:8@de'
 * ```
 */
export async function translateRelURL(url: string, targetLanguage: LanguageCode): Promise<string | null> {
  const { languages, primaryLanguage } = useRuntimeConfig().pruvious.i18n
  const parsed = parseRelURL(url, primaryLanguage)

  if (!parsed || !isValidRelURL(parsed) || !languages.some(({ code }) => code === targetLanguage)) {
    return null
  }

  if (targetLanguage === parsed.language) {
    return url
  }

  const index = await getLinkIndex()
  const includeDrafts = hasPermission('preview-drafts')
  const route = index.routes.find((r) => r.id === parsed.routeId)

  if (!route || isNull(route.path[targetLanguage] ?? null)) {
    return null
  }

  if (!includeDrafts && route.isPublic[targetLanguage] !== true) {
    return null
  }

  if (parsed.collection) {
    const collection = collections[parsed.collection as keyof Collections]!

    if (!collection.meta.translatable) {
      return buildRelURL({
        routeId: parsed.routeId,
        collection: parsed.collection,
        recordId: parsed.recordId,
        language: targetLanguage,
        query: parsed.query,
        hash: parsed.hash,
      })
    }

    const sourceRecord = (index.records[parsed.collection] ?? []).find(
      (record) => record.id === parsed.recordId && record.language === parsed.language,
    )

    if (!sourceRecord) {
      return null
    }

    const translatedRecord = getRecordTranslations(index, parsed.collection, sourceRecord).find(
      (record) => record.language === targetLanguage && (includeDrafts || record.isPublic),
    )

    if (!translatedRecord) {
      return null
    }

    return buildRelURL({
      routeId: parsed.routeId,
      collection: parsed.collection,
      recordId: translatedRecord.id,
      language: targetLanguage,
      query: parsed.query,
      hash: parsed.hash,
    })
  }

  return buildRelURL({
    routeId: parsed.routeId,
    language: targetLanguage,
    query: parsed.query,
    hash: parsed.hash,
  })
}

/**
 * Resolves a `rel://` URL to its public URL path (e.g. `rel://Routes:1/Articles:5@de` → `/de/blog/my-article`).
 *
 * Non-`rel://` URLs (external, relative, or empty) are returned unchanged, so any `href` value can be piped
 * through this function. Query strings and hash fragments are preserved, and the pinned `@{language}` is
 * respected as-is - use {@link translateRelURL} first if you need to switch languages.
 *
 * Returns `null` only when the input is a `rel://` URL that cannot be resolved: malformed, or pointing at a
 * missing or unpublished route/record.
 *
 * @example
 * ```ts
 * await populateRelURL('rel://Routes:1/Articles:5@de?foo=bar#section')
 * // '/de/blog/my-article?foo=bar#section'
 *
 * await populateRelURL('https://example.com')
 * // 'https://example.com'
 * ```
 */
export async function populateRelURL(url: string): Promise<string | null> {
  if (!isRelURL(url)) {
    return url
  }

  const { primaryLanguage } = useRuntimeConfig().pruvious.i18n
  const parsed = parseRelURL(url, primaryLanguage)

  if (!parsed || !isValidRelURL(parsed)) {
    return null
  }

  const index = await getLinkIndex()
  const resolvedPath = resolveRelURLFromIndex(
    index,
    {
      routeId: parsed.routeId,
      collection: parsed.collection,
      recordId: parsed.recordId,
      language: parsed.language,
    },
    { includeDrafts: hasPermission('preview-drafts') },
  )

  if (isNull(resolvedPath)) {
    return null
  }

  const querySuffix = parsed.query ? `?${parsed.query}` : ''
  const hashSuffix = parsed.hash ? `#${parsed.hash}` : ''

  return resolvedPath + querySuffix + hashSuffix
}

/**
 * The reason a parsed `rel://` URL failed structural validation.
 *
 * - `invalid-route-id` - the route ID is not a positive integer.
 * - `unknown-collection` - the collection does not exist or is not routable.
 * - `unsupported-language` - the language pin is not a configured language.
 * - `invalid-record-id` - the record ID is not a positive integer.
 */
export type RelURLError =
  | { reason: 'invalid-route-id' }
  | { reason: 'unknown-collection'; collection: string }
  | { reason: 'unsupported-language'; language: string }
  | { reason: 'invalid-record-id' }

/**
 * Validates the components of a parsed `rel://` URL to ensure they reference existing routes, collections, and languages.
 * Returns the first failing reason, or `null` if the components are valid.
 * It does not validate the existence of specific record IDs.
 */
export function validateRelURL(parsed: ParsedRelURL): RelURLError | null {
  if (!isPositiveInteger(parsed.routeId)) {
    return { reason: 'invalid-route-id' }
  }

  if (parsed.collection) {
    const collection = collections[parsed.collection as keyof Collections]
    if (!collection || !collection.meta.routing.enabled) {
      return { reason: 'unknown-collection', collection: parsed.collection }
    }
  }

  if (parsed.language) {
    const { languages } = useRuntimeConfig().pruvious.i18n
    if (!languages.some(({ code }) => code === parsed.language)) {
      return { reason: 'unsupported-language', language: parsed.language }
    }
  }

  if (isDefined(parsed.recordId) && !isPositiveInteger(parsed.recordId)) {
    return { reason: 'invalid-record-id' }
  }

  return null
}

/**
 * Validates the components of a parsed `rel://` URL to ensure they reference existing routes, collections, and languages.
 * It does not validate the existence of specific record IDs.
 */
export function isValidRelURL(parsed: ParsedRelURL): boolean {
  return isNull(validateRelURL(parsed))
}

/**
 * Lists all available URL paths for the website with pagination support.
 *
 * Enumerates URLs from both singleton routes (exact path match) and
 * collection routes (route path + record subpath), including their translations.
 */
export async function listRoutes(options?: ListRoutesOptions): Promise<ListRoutesResult> {
  const perPage = options?.perPage ?? 50
  const page = options?.page ?? 1
  const { languages, primaryLanguage, prefixPrimaryLanguage } = useRuntimeConfig().pruvious.i18n
  const includeDrafts = options?.includeDrafts ?? false
  const indexableOnly = options?.indexableOnly ?? false
  const allLanguages = options?.language === 'all'
  const targetLanguages = allLanguages
    ? (languages.map(({ code }) => code) as LanguageCode[])
    : [(options?.language ?? primaryLanguage) as LanguageCode]

  if (indexableOnly) {
    const baseSEO = (await selectSingleton('SEO').populate().get()).data
    if (baseSEO?.isIndexable === false) {
      return { data: [], currentPage: page, lastPage: 1, perPage, total: 0 }
    }
  }

  const index = await getLinkIndex()

  const routePathInLanguage = (route: LinkIndexRoute, code: string): string | null => {
    const path = route.path[code] ?? null
    if (isNull(path) || (!includeDrafts && route.isPublic[code] !== true)) {
      return null
    }
    if (indexableOnly && route.isIndexable[code] !== true) {
      return null
    }
    return path
  }

  const entries: ListRoutesEntry[] = []

  for (const language of targetLanguages) {
    const languagePrefix = language !== primaryLanguage || prefixPrimaryLanguage ? `/${language}` : ''
    const otherLanguages = languages.filter(({ code }) => code !== language)
    const languageEntries: ListRoutesEntry[] = []

    const routesInLanguage = index.routes.filter((route) => isNotNull(routePathInLanguage(route, language)))

    for (const route of routesInLanguage) {
      const basePath = route.path[language]!

      if (route.referencedSingleton) {
        languageEntries.push({
          path: normalizeRoutePath(languagePrefix + basePath),
          translations: allLanguages
            ? ({} as Record<LanguageCode, string | null>)
            : (Object.fromEntries(
                otherLanguages.map(({ code }) => {
                  const otherPath = routePathInLanguage(route, code)
                  return [code, isNotNull(otherPath) ? normalizeRoutePath(code + otherPath) : null]
                }),
              ) as Record<LanguageCode, string | null>),
        })
      }

      for (const collectionName of route.referencedCollections) {
        const collection = collections[collectionName as keyof Collections]

        if (!collection?.meta?.routing?.enabled) {
          continue
        }

        const translatable = collection.meta.translatable
        const records = (index.records[collectionName] ?? []).filter(
          (record) =>
            (translatable ? record.language === language : true) &&
            (includeDrafts || record.isPublic) &&
            (!indexableOnly || record.isIndexable),
        )

        for (const record of records) {
          languageEntries.push({
            path: normalizeRoutePath(`${languagePrefix}/${basePath}/${record.subpath}`),
            translations: allLanguages
              ? ({} as Record<LanguageCode, string | null>)
              : (Object.fromEntries(
                  otherLanguages.map(({ code }) => {
                    const otherPath = routePathInLanguage(route, code)

                    if (isNull(otherPath)) {
                      return [code, null]
                    }

                    if (translatable) {
                      const sibling = getRecordTranslations(index, collectionName, record).find(
                        (translation) =>
                          translation.language === code &&
                          (includeDrafts || translation.isPublic) &&
                          (!indexableOnly || translation.isIndexable),
                      )
                      return [code, sibling ? normalizeRoutePath(`${code}/${otherPath}/${sibling.subpath}`) : null]
                    }

                    return [code, normalizeRoutePath(`${code}/${otherPath}/${record.subpath}`)]
                  }),
                ) as Record<LanguageCode, string | null>),
          })
        }
      }
    }

    languageEntries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    entries.push(...languageEntries)
  }

  const total = entries.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  const start = (page - 1) * perPage

  return { data: entries.slice(start, start + perPage), currentPage: page, lastPage, perPage, total }
}
