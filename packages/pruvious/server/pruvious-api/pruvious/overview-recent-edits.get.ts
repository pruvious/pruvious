import {
  assertUserPermissions,
  collections,
  getLinkIndex,
  hasCollectionPermission,
  hasPermission,
  type Collections,
  type LanguageCode,
} from '#pruvious/server'
import { isNumber, kebabCase } from '@pruvious/utils'

interface RecentEditsEntry {
  collectionName: string
  collectionLabel: string | null
  collectionIcon: string | null
  recordId: number
  label: string
  language: LanguageCode | null
  isPublic: boolean
  updatedAt: number
  editUrl: string
}

interface RecentEditsResult {
  data: RecentEditsEntry[]
  limit: number
}

const LIMIT = 20

/**
 * Lists the most recently updated records the user can read, across all routable collections.
 * Sourced from the link index so labels are already resolved.
 *
 * Non-routable collections (Users, Roles, ...) are not included - they're not in the link index.
 */
export default defineEventHandler(async (event): Promise<RecentEditsResult> => {
  assertUserPermissions(event, ['access-dashboard'])

  const runtimeConfig = useRuntimeConfig()
  const { languages } = runtimeConfig.pruvious.i18n
  const dashboardBase: string = runtimeConfig.pruvious.dashboard.basePath
  const languageQuery = (code: string) => (languages.length > 1 ? `?language=${code}` : '')

  const index = await getLinkIndex()
  const canSeeDrafts = hasPermission('preview-drafts')
  const rows: RecentEditsEntry[] = []

  for (const [collectionName, records] of Object.entries(index.records)) {
    const collection = collections[collectionName as keyof Collections] as any

    if (!collection || !hasCollectionPermission(collectionName as keyof Collections, 'read')) {
      continue
    }

    const collectionSlug = kebabCase(collectionName)
    const collectionLabel = (collection.meta?.ui?.label as string | undefined) ?? null
    const collectionIcon = (collection.meta?.ui?.icon as string | undefined) ?? null

    for (const record of records) {
      if (!isNumber(record.updatedAt)) {
        continue
      }

      if (!record.isPublic && !canSeeDrafts) {
        continue
      }

      rows.push({
        collectionName,
        collectionLabel,
        collectionIcon,
        recordId: record.id,
        label: record.label || `#${record.id}`,
        language: collection.meta.translatable ? (record.language as LanguageCode) : null,
        isPublic: record.isPublic,
        updatedAt: record.updatedAt,
        editUrl: `${dashboardBase}collections/${collectionSlug}/${record.id}${languageQuery(record.language)}`,
      })
    }
  }

  rows.sort((a, b) => b.updatedAt - a.updatedAt)

  return { data: rows.slice(0, LIMIT), limit: LIMIT }
})
