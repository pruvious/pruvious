import {
  collections,
  getRouteReferences,
  selectFrom,
  selectSingleton,
  type Collections,
  type LanguageCode,
  type RouteReferenceName,
  type RouteReferences,
  type Singletons,
} from '#pruvious/server'
import type { ExtractPopulatedTypes, GenericField } from '@pruvious/orm'
import { isNotNull, pick, withLeadingSlash, withoutTrailingSlash, withTrailingSlash } from '@pruvious/utils'

export interface GenericRouteReference {
  /**
   * Indicates whether the reference is a collection or singleton.
   */
  dataContainerType: 'collection' | 'singleton'

  /**
   * The name of the collection or singleton.
   */
  dataContainerName: string

  /**
   * A key-value object of `Field` instances representing the `routing.publicFields` of the collection or singleton.
   */
  publicFields: Record<string, GenericField>
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
  data: ExtractPopulatedTypes<RouteReferences[TRef]['publicFields']>

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

/**
 * Finds and returns a route by its full URL `path`.
 *
 * @returns a `ResolvedRoute`, `RouteRedirect` object, or `null` if the route cannot be resolved.
 */
export async function resolveRoute<TRef extends RouteReferenceName>(
  path: string,
): Promise<ResolvedRoute<TRef> | RouteRedirect | null> {
  const subpaths = path.split('/').filter(Boolean)
  const runtimeConfig = useRuntimeConfig()
  const { languages, primaryLanguage, prefixPrimaryLanguage } = runtimeConfig.pruvious.i18n
  const { trailingSlash } = runtimeConfig.pruvious.routing
  const language = (languages.find(({ code }) => subpaths[0] === code)?.code ?? primaryLanguage) as LanguageCode
  const languagePrefix = language !== primaryLanguage || prefixPrimaryLanguage ? `/${language}` : ''
  const languageSuffix = language.toUpperCase() as Uppercase<LanguageCode>
  const normalizedPath = ('/' + subpaths.join('/')).slice(languagePrefix.length) || '/'
  const otherLanguages = languages.filter(({ code }) => code !== language)
  const otherLanguageSuffixes = otherLanguages.map(({ code }) => code.toUpperCase() as Uppercase<LanguageCode>)
  const tryPaths: string[] = ['/']
  const routeReferences = await getRouteReferences()

  if (subpaths[0] === language) {
    subpaths.shift()
  }

  for (let i = 1; i <= subpaths.length; i++) {
    const joined = subpaths.slice(0, i).join('/')
    tryPaths.unshift(`/${joined}`)
  }

  const routeCandidates = await Promise.all([
    selectSingleton('SEO').language(language).populate().get(),
    ...tryPaths.map((tryPath) =>
      selectFrom('Routes')
        .where(`path${language.toUpperCase()}` as any, 'ilike', tryPath)
        .where(`isPublic${language.toUpperCase()}` as any, '=', true)
        .first()
        .then(({ data }) => data),
    ),
  ] as unknown as (ExtractPopulatedTypes<Collections['Routes']['fields']> | null)[])

  const baseSEO = (routeCandidates.shift() as any).data as ExtractPopulatedTypes<Singletons['SEO']['fields']>
  const exactRoute = routeCandidates[0]!

  for (const route of routeCandidates) {
    if (route) {
      for (const { match, to, code, forwardQueryParams } of route[`redirects${languageSuffix}`]) {
        if (!match || new RegExp(match, 'im').test(normalizedPath)) {
          return { to, code: code as 301 | 302, forwardQueryParams }
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

        return {
          language,
          translations: Object.fromEntries(
            otherLanguages.map(({ code }, i) => [
              code,
              exactRoute![`path${otherLanguageSuffixes[i]!}`] && exactRoute![`isPublic${otherLanguageSuffixes[i]!}`]
                ? (trailingSlash ? withTrailingSlash : withoutTrailingSlash)(
                    code !== primaryLanguage || prefixPrimaryLanguage ? `/${code}` : '',
                  ) + exactRoute![`path${otherLanguageSuffixes[i]!}`]
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
            url: (trailingSlash ? withTrailingSlash : withoutTrailingSlash)(
              baseSEO.baseURL + languagePrefix + exactRoute[`path${languageSuffix}`]!,
            ),
            isIndexable: exactRoute[`seo${languageSuffix}`].isIndexable,
          },
          ref: singletonReference[0] as TRef,
          data: (await selectSingleton(exactRoute.referencedSingleton)
            .select(Object.keys(singletonReference[1].publicFields) as any)
            .language(language)
            .get()) as any,
          softRedirect:
            languagePrefix + exactRoute[`path${languageSuffix}`] !== withLeadingSlash(path)
              ? languagePrefix + exactRoute[`path${languageSuffix}`]!
              : undefined,
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
        const basePath = route![`path${languageSuffix}`]!
        const subpath = normalizedPath.slice(basePath.length)

        if (collection.meta.routing.isPublic.enabled) {
          query.where('isPublic', '=', true)
        }

        if (collection.meta.routing.seo.enabled) {
          select.push('seo')
        }

        if (collection.meta.translatable) {
          query.where('language', '=', language)

          const whereIsPublic = (code: string) =>
            collection.meta.routing.isPublic.enabled ? ` and "${collectionName}_${code}"."isPublic" = 1` : ''

          for (const { code } of languages) {
            if (code !== language) {
              select.push(
                `(select "subpath" from "${collectionName}" as "${collectionName}_${code}" where "${collectionName}_${code}"."translations" = "${collectionName}"."translations" and "language" = '${code}'${whereIsPublic(code)}) as "_${code}"`,
              )
            }
          }
        }

        return query
          .selectRaw(select.join(', '))
          .where('subpath', 'ilike', subpath)
          .populate()
          .first()
          .then(({ data }) => ({ ref: collectionReference![0] as TRef, collection, data, route: route! }))
      })
    }),
  )

  for (const record of collectionRecords) {
    if (record?.data) {
      const { ref, collection, data, route } = record
      const realPath = `${languagePrefix}${route[`path${languageSuffix}`]}/${data.subpath}`.replaceAll('//', '/')
      const seo = collection.meta.routing.seo.enabled ? data.seo : {}
      const routeSEO = route[`seo${languageSuffix}`]
      const title = seo.title || routeSEO.title

      return {
        language,
        translations: Object.fromEntries(
          otherLanguages.map(({ code }) => [
            code,
            isNotNull(data[`_${code}`])
              ? (trailingSlash ? withTrailingSlash : withoutTrailingSlash)(
                  (code !== primaryLanguage || prefixPrimaryLanguage ? `/${code}` : '') + `/${data[`_${code}`]}`,
                )
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
          url: (trailingSlash ? withTrailingSlash : withoutTrailingSlash)(baseSEO.baseURL + realPath),
          isIndexable: seo.isIndexable ?? routeSEO.isIndexable,
        },
        ref,
        data: pick(data, collection.meta.routing.publicFields) as any,
        softRedirect: realPath !== withLeadingSlash(path) ? realPath : undefined,
      }
    }
  }

  return null
}
