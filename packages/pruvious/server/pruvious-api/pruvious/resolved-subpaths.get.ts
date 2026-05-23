import {
  assertUserPermissions,
  collections,
  getLinkIndex,
  hasPermission,
  normalizeRoutePath,
  type Collections,
  type LanguageCode,
} from '#pruvious/server'
import { isNull, isString } from '@pruvious/utils'

interface ResolvedSubpath {
  /**
   * The `Routes` record ID that produced this match.
   */
  routeId: number

  /**
   * The parent route's path in the requested language (before the subpath is appended).
   */
  routePath: string

  /**
   * The full, language-prefixed URL path the record is reachable at.
   */
  fullPath: string

  /**
   * Whether the parent route is publicly accessible in the requested language.
   * Drafts are only included when the caller has the `preview-drafts` permission.
   */
  isPublic: boolean
}

interface ResolvedSubpathsResult {
  data: ResolvedSubpath[]
}

/**
 * Lists the full URLs a routable collection record is reachable at by joining each parent route's
 * path in the requested language with the given subpath.
 */
export default defineEventHandler(async (event): Promise<ResolvedSubpathsResult> => {
  assertUserPermissions(event, ['access-dashboard'])

  const query = getQuery(event)
  const empty: ResolvedSubpathsResult = { data: [] }

  if (!isString(query.collection) || !isString(query.subpath) || !isString(query.language)) {
    return empty
  }

  const { languages, primaryLanguage, prefixPrimaryLanguage } = useRuntimeConfig().pruvious.i18n
  const configuredCodes = languages.map(({ code }) => code)

  if (!configuredCodes.includes(query.language)) {
    return empty
  }

  const language = query.language as LanguageCode
  const collection = collections[query.collection as keyof Collections] as any

  if (!collection?.meta?.routing?.enabled) {
    return empty
  }

  const includeDrafts = hasPermission('preview-drafts')
  const languagePrefix = language !== primaryLanguage || prefixPrimaryLanguage ? `/${language}` : ''
  const index = await getLinkIndex()

  const rows: ResolvedSubpath[] = []

  for (const route of index.routes) {
    if (!route.referencedCollections.includes(query.collection)) {
      continue
    }

    const routePath = route.path[language] ?? null
    if (isNull(routePath)) {
      continue
    }

    const isPublic = route.isPublic[language] === true
    if (!includeDrafts && !isPublic) {
      continue
    }

    rows.push({
      routeId: route.id,
      routePath,
      fullPath: normalizeRoutePath(`${languagePrefix}/${routePath}/${query.subpath}`),
      isPublic,
    })
  }

  rows.sort((a, b) => (a.fullPath < b.fullPath ? -1 : a.fullPath > b.fullPath ? 1 : 0))

  return { data: rows }
})
