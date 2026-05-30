import {
  assertUserPermissions,
  collections,
  getLinkIndex,
  hasCollectionPermission,
  hasPermission,
  type Collections,
  type LanguageCode,
} from '#pruvious/server'
import { kebabCase } from '@pruvious/utils'

interface DraftsEntry {
  collectionName: string
  collectionLabel: string | null
  collectionIcon: string | null
  recordId: number
  label: string
  language: LanguageCode | null
  updatedAt: number | null
  editUrl: string
}

interface DraftsResult {
  data: DraftsEntry[]
  limit: number
  available: boolean
}

const LIMIT = 20

/**
 * Lists the most recently updated draft (non-public) records the user can read.
 * Requires the `'preview-drafts'` permission - returns `available: false` otherwise so the dashboard
 * can hide the card entirely.
 *
 * Sourced from the link index, so only routable collections with `isPublic` are considered.
 */
export default defineEventHandler(async (event): Promise<DraftsResult> => {
  assertUserPermissions(event, ['access-dashboard'])

  if (!hasPermission('preview-drafts')) {
    return { data: [], limit: LIMIT, available: false }
  }

  const runtimeConfig = useRuntimeConfig()
  const { languages } = runtimeConfig.pruvious.i18n
  const dashboardBase: string = runtimeConfig.pruvious.dashboard.basePath
  const languageQuery = (code: string) => (languages.length > 1 ? `?language=${code}` : '')

  const index = await getLinkIndex()
  const rows: DraftsEntry[] = []
  const hasMultipleLanguages = languages.length > 1

  // Draft routes (Route records where isPublic{LANG} is false for some language).
  const routesCollection = collections.Routes as any
  if (routesCollection && hasCollectionPermission('Routes', 'read')) {
    const routesLabel = (routesCollection.meta?.ui?.label as string | undefined) ?? null
    const routesIcon = (routesCollection.meta?.ui?.icon as string | undefined) ?? null

    for (const route of index.routes) {
      for (const { code } of languages) {
        const language = code as LanguageCode
        const routePath = route.path[language] ?? null

        if (routePath === null || route.isPublic[language] === true) {
          continue
        }

        rows.push({
          collectionName: 'Routes',
          collectionLabel: routesLabel,
          collectionIcon: routesIcon,
          recordId: route.id,
          label: routePath,
          language: hasMultipleLanguages ? language : null,
          updatedAt: route.updatedAt,
          editUrl: `${dashboardBase}collections/routes/${route.id}${languageQuery(language)}`,
        })
      }
    }
  }

  // Draft records (collection records with isPublic=false).
  for (const [collectionName, records] of Object.entries(index.records)) {
    const collection = collections[collectionName as keyof Collections] as any

    if (
      !collection ||
      !collection.meta?.routing?.isPublic?.enabled ||
      !hasCollectionPermission(collectionName as keyof Collections, 'read')
    ) {
      continue
    }

    const collectionSlug = kebabCase(collectionName)
    const collectionLabel = (collection.meta?.ui?.label as string | undefined) ?? null
    const collectionIcon = (collection.meta?.ui?.icon as string | undefined) ?? null

    for (const record of records) {
      if (record.isPublic) {
        continue
      }

      rows.push({
        collectionName,
        collectionLabel,
        collectionIcon,
        recordId: record.id,
        label: record.label || `#${record.id}`,
        language: collection.meta.translatable ? (record.language as LanguageCode) : null,
        updatedAt: record.updatedAt,
        editUrl: `${dashboardBase}collections/${collectionSlug}/${record.id}${languageQuery(record.language)}`,
      })
    }
  }

  rows.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))

  return { data: rows.slice(0, LIMIT), limit: LIMIT, available: true }
})
