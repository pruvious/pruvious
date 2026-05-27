import {
  assertUserPermissions,
  collections,
  getLinkIndex,
  hasCollectionPermission,
  hasPermission,
  hasSingletonPermission,
  normalizeRoutePath,
  type Collections,
  type LanguageCode,
  type Singletons,
} from '#pruvious/server'
import { isNull, kebabCase } from '@pruvious/utils'

interface OverviewRoutesEntry {
  /**
   * The `Routes` record ID this entry belongs to.
   */
  routeId: number

  /**
   * The full, language-prefixed URL path this entry is reachable at.
   */
  path: string

  /**
   * The language code of this entry.
   */
  language: LanguageCode

  /**
   * Whether the entry is publicly accessible (otherwise it is a draft).
   */
  isPublic: boolean

  /**
   * The type of content this route references, or `null` for bare routes.
   */
  referenceType: 'collection' | 'singleton' | null

  /**
   * The name of the referenced collection or singleton, or `null` for bare routes.
   */
  referenceName: string | null

  /**
   * The ID of the referenced collection record. `null` for singletons and bare routes.
   */
  recordId: number | null

  /**
   * The dashboard URL of the referenced collection record or singleton, or `null` for bare routes.
   */
  editUrl: string | null

  /**
   * The dashboard URL of the `Routes` record itself.
   */
  routeEditUrl: string

  /**
   * A human-readable label for the entry (record label or route path).
   */
  label: string
}

interface OverviewRoutesResult {
  data: OverviewRoutesEntry[]

  /**
   * Whether the current user can see draft entries.
   */
  canSeeDrafts: boolean
}

/**
 * Lists every routed URL across all configured languages for the dashboard overview page.
 * Entries include reference info so the dashboard can link directly to the underlying
 * collection record or singleton.
 *
 * Drafts are only included when the caller has the `preview-drafts` permission.
 */
export default defineEventHandler(async (event): Promise<OverviewRoutesResult> => {
  assertUserPermissions(event, ['access-dashboard'])

  const runtimeConfig = useRuntimeConfig()
  const { languages, primaryLanguage, prefixPrimaryLanguage } = runtimeConfig.pruvious.i18n
  const dashboardBase: string = runtimeConfig.pruvious.dashboard.basePath
  const canSeeDrafts = hasPermission('preview-drafts')
  const langPrefix = (code: string) => (code !== primaryLanguage || prefixPrimaryLanguage ? `/${code}` : '')
  const languageQuery = (code: string) => (languages.length > 1 ? `?language=${code}` : '')

  const index = await getLinkIndex()
  const rowsByLanguage = new Map<LanguageCode, OverviewRoutesEntry[]>()

  for (const { code } of languages) {
    rowsByLanguage.set(code as LanguageCode, [])
  }

  for (const route of index.routes) {
    const routeEditUrl = `${dashboardBase}collections/routes/${route.id}`

    for (const { code } of languages) {
      const language = code as LanguageCode
      const routePath = route.path[language] ?? null

      if (isNull(routePath)) {
        continue
      }

      const isRoutePublic = route.isPublic[language] === true

      if (!canSeeDrafts && !isRoutePublic) {
        continue
      }

      if (route.referencedSingleton) {
        const singletonName = route.referencedSingleton
        const canReadSingleton = hasSingletonPermission(singletonName as keyof Singletons, 'read')

        // Draft entries reveal non-public content - require read permission on the reference.
        if (isRoutePublic || canReadSingleton) {
          rowsByLanguage.get(language)!.push({
            routeId: route.id,
            path: normalizeRoutePath(langPrefix(language) + routePath),
            language,
            isPublic: isRoutePublic,
            referenceType: 'singleton',
            referenceName: singletonName,
            recordId: null,
            editUrl: `${dashboardBase}singletons/${kebabCase(singletonName)}${languageQuery(language)}`,
            routeEditUrl,
            label: singletonName,
          })
        }
      }

      for (const collectionName of route.referencedCollections) {
        const collection = collections[collectionName as keyof Collections] as any

        if (!collection?.meta?.routing?.enabled) {
          continue
        }

        const translatable = !!collection.meta.translatable
        const collectionSlug = kebabCase(collectionName)
        const canReadCollection = hasCollectionPermission(collectionName as keyof Collections, 'read')

        for (const record of index.records[collectionName] ?? []) {
          if (translatable && record.language !== language) {
            continue
          }

          const isRecordPublic = isRoutePublic && record.isPublic

          if (!canSeeDrafts && !isRecordPublic) {
            continue
          }

          // Draft entries reveal non-public content - require read permission on the reference.
          if (!isRecordPublic && !canReadCollection) {
            continue
          }

          rowsByLanguage.get(language)!.push({
            routeId: route.id,
            path: normalizeRoutePath(`${langPrefix(language)}/${routePath}/${record.subpath}`),
            language,
            isPublic: isRecordPublic,
            referenceType: 'collection',
            referenceName: collectionName,
            recordId: record.id,
            editUrl: `${dashboardBase}collections/${collectionSlug}/${record.id}${languageQuery(language)}`,
            routeEditUrl,
            label: record.label || `#${record.id}`,
          })
        }
      }

      const isBareRoute = !route.referencedSingleton && route.referencedCollections.length === 0

      if (isBareRoute) {
        if (isRoutePublic || hasCollectionPermission('Routes', 'read')) {
          rowsByLanguage.get(language)!.push({
            routeId: route.id,
            path: normalizeRoutePath(langPrefix(language) + routePath),
            language,
            isPublic: isRoutePublic,
            referenceType: null,
            referenceName: null,
            recordId: null,
            editUrl: null,
            routeEditUrl,
            label: routePath,
          })
        }
      }
    }
  }

  const data: OverviewRoutesEntry[] = []

  for (const { code } of languages) {
    const list = rowsByLanguage.get(code as LanguageCode)!
    list.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    data.push(...list)
  }

  return { data, canSeeDrafts }
})
