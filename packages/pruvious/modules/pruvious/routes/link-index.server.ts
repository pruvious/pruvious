import { collections, database, type Collections } from '#pruvious/server'
import { isArray, isDefined, isNull, isNumber, isRelURL, isString, isUndefined, parseRelURL } from '@pruvious/utils'
import type { RawCacheRule } from '../cache/page.server'
import { normalizeRoutePath } from './utils.server'

/**
 * A parsed `rel://` canonical override target. `null` when the override is absent or external.
 * Cycle-detection validators consult this to follow canonical chains without hitting the database.
 */
export interface CanonicalRef {
  routeId: number
  collection?: string
  recordId?: number
}

export interface LinkIndexRoute {
  id: number
  referencedSingleton: string | null
  referencedCollections: string[]
  path: Record<string, string | null>
  isPublic: Record<string, boolean>
  isIndexable: Record<string, boolean>
  hasCanonicalOverride: Record<string, boolean>
  canonicalRef: Record<string, CanonicalRef | null>
  cacheRules: Record<string, RawCacheRule[]>
  redirects: Record<string, RawRouteRedirect[]>
  updatedAt: number | null
}

/**
 * A single redirect rule as stored on a Routes record (per-language `redirects{LANG}` field).
 *
 * Only the `match` and `to` fields are needed to decide whether the page cache must defer to
 * `resolveRoute` (so its redirect can be issued); the response code is irrelevant for cache routing.
 */
export interface RawRouteRedirect {
  match: string | null
  to: string | null
}

export interface LinkIndexRecord {
  id: number
  language: string
  subpath: string
  isPublic: boolean
  isIndexable: boolean
  hasCanonicalOverride: boolean
  canonicalRef: CanonicalRef | null
  translations: string | null
  label: string
  search: string
  updatedAt: number | null
}

/** A precomputed snapshot of every internal link target, cached in the `Options` table. */
export interface LinkIndex {
  version: number
  builtAt: number
  languages: string[]
  routes: LinkIndexRoute[]
  records: Record<string, LinkIndexRecord[]>
}

export const LINK_INDEX_VERSION = 3

const LINK_INDEX_KEY = 'linkIndex'
const LINK_INDEX_FLUSHED_AT_KEY = 'linkIndexFlushedAt'
const LINK_INDEX_LOCK_KEY = 'linkIndex'
const LINK_INDEX_LOCK_TIMEOUT = 15000

type Db = ReturnType<typeof database>

/** Normalizes a `labelField` config to an array of segments. */
export function labelSegments(labelField: string | string[]): string[] {
  return isArray(labelField) ? labelField : [labelField]
}

/** A segment is a field name when it is `id` or a key of the field map. */
export function isFieldSegment(fields: Record<string, any>, segment: string): boolean {
  return segment === 'id' || segment in fields
}

/** Resolves a `labelField` against a record into a display string. */
export function resolveRecordLabel(
  fields: Record<string, any>,
  record: Record<string, any>,
  labelField: string | string[],
): string {
  return labelSegments(labelField)
    .map((segment) => {
      if (!isFieldSegment(fields, segment)) {
        return segment
      }
      const value = record[segment]
      return isNull(value) || isUndefined(value) ? '' : String(value)
    })
    .join('')
    .trim()
}

/** The field-name segments of a `labelField` that must be selected to resolve the label. */
export function labelSelectFields(fields: Record<string, any>, labelField: string | string[]): string[] {
  return [...new Set(labelSegments(labelField).filter((segment) => isFieldSegment(fields, segment)))]
}

/**
 * Parses a stored `canonicalURL.url` value into a `CanonicalRef`. Returns `null` for unset,
 * external (`https://...`), or unparseable values - cycle detection only cares about `rel://`
 * targets that resolve to other Pruvious entities.
 */
function parseCanonicalRef(rawUrl: unknown, primaryLanguage: string): CanonicalRef | null {
  if (!isString(rawUrl) || !rawUrl || !isRelURL(rawUrl)) {
    return null
  }
  const parsed = parseRelURL(rawUrl, primaryLanguage)
  if (!parsed || !isNumber(parsed.routeId)) {
    return null
  }
  return {
    routeId: parsed.routeId,
    collection: parsed.collection,
    recordId: parsed.recordId,
  }
}

/** Builds a fresh {@link LinkIndex} from the database. */
export async function buildLinkIndex(db: Db = database()): Promise<LinkIndex> {
  const { languages, primaryLanguage } = useRuntimeConfig().pruvious.i18n
  const qb = db.queryBuilder()

  const routesResult = await qb.selectFrom('Routes' as any).all()
  if (!routesResult.success) {
    throw new Error('Failed to build the link index: could not read the `Routes` collection.')
  }
  const routes: LinkIndexRoute[] = []

  for (const row of (routesResult.data ?? []) as any[]) {
    const path: Record<string, string | null> = {}
    const isPublic: Record<string, boolean> = {}
    const isIndexable: Record<string, boolean> = {}
    const hasCanonicalOverride: Record<string, boolean> = {}
    const canonicalRef: Record<string, CanonicalRef | null> = {}
    const cacheRules: Record<string, RawCacheRule[]> = {}
    const redirects: Record<string, RawRouteRedirect[]> = {}

    for (const { code } of languages) {
      const suffix = code.toUpperCase()
      path[code] = row[`path${suffix}`] ?? null
      isPublic[code] = row[`isPublic${suffix}`] === true
      const seo = row[`seo${suffix}`]
      isIndexable[code] = !seo || seo.isIndexable !== false
      hasCanonicalOverride[code] = isString(seo?.canonicalURL?.url) && seo.canonicalURL.url.length > 0
      canonicalRef[code] = parseCanonicalRef(seo?.canonicalURL?.url, primaryLanguage)
      cacheRules[code] = isArray(row[`cacheRules${suffix}`]) ? row[`cacheRules${suffix}`] : []
      redirects[code] = isArray(row[`redirects${suffix}`])
        ? (row[`redirects${suffix}`] as any[]).map((r) => ({
            match: isString(r?.match) ? r.match : null,
            to: isString(r?.to) ? r.to : null,
          }))
        : []
    }

    routes.push({
      id: row.id,
      referencedSingleton: row.referencedSingleton ?? null,
      referencedCollections: row.referencedCollections ?? [],
      path,
      isPublic,
      isIndexable,
      hasCanonicalOverride,
      canonicalRef,
      cacheRules,
      redirects,
      updatedAt: isNumber(row.updatedAt) ? row.updatedAt : null,
    })
  }

  const records: Record<string, LinkIndexRecord[]> = {}

  for (const [collectionName, collection] of Object.entries(collections) as [string, any][]) {
    if (!collection.meta?.routing?.enabled) {
      continue
    }

    const labelField = collection.meta.routing.labelField
    const translatable = !!collection.meta.translatable
    const hasIsPublic = !!collection.meta.routing.isPublic.enabled
    const hasSEO = !!collection.meta.routing.seo.enabled
    const hasUpdatedAt = collection.meta?.updatedAt?.enabled === true
    const selectFields = [
      ...new Set([
        'id',
        'subpath',
        ...labelSelectFields(collection.fields, labelField),
        ...(translatable ? ['language', 'translations'] : []),
        ...(hasIsPublic ? ['isPublic'] : []),
        ...(hasSEO ? ['seo'] : []),
        ...(hasUpdatedAt ? ['updatedAt'] : []),
      ]),
    ]

    const recordsResult = await qb
      .selectFrom(collectionName as any)
      .select(selectFields as any)
      .all()
    if (!recordsResult.success) {
      throw new Error(`Failed to build the link index: could not read the \`${collectionName}\` collection.`)
    }

    const list: LinkIndexRecord[] = []

    for (const row of (recordsResult.data ?? []) as any[]) {
      // A `null` subpath is not routed; an empty string serves the record at the route root.
      if (!isString(row.subpath)) {
        continue
      }

      const label = resolveRecordLabel(collection.fields, row, labelField)

      list.push({
        id: row.id,
        language: translatable ? row.language : primaryLanguage,
        subpath: row.subpath,
        isPublic: hasIsPublic ? row.isPublic === true : true,
        isIndexable: hasSEO ? !row.seo || row.seo.isIndexable !== false : true,
        hasCanonicalOverride: hasSEO && isString(row.seo?.canonicalURL?.url) && row.seo.canonicalURL.url.length > 0,
        canonicalRef: hasSEO ? parseCanonicalRef(row.seo?.canonicalURL?.url, primaryLanguage) : null,
        translations: translatable ? row.translations || null : null,
        label,
        search: `${label} ${row.subpath}`.toLowerCase(),
        updatedAt: hasUpdatedAt && isNumber(row.updatedAt) ? row.updatedAt : null,
      })
    }

    records[collectionName] = list
  }

  return {
    version: LINK_INDEX_VERSION,
    builtAt: Date.now(),
    languages: languages.map(({ code }) => code),
    routes,
    records,
  }
}

function isFresh(index: LinkIndex | undefined, flushedAt: number | undefined): index is LinkIndex {
  // The cached blob is untrusted JSON - reject anything that is not the current shape.
  if (!index || index.version !== LINK_INDEX_VERSION || !isArray(index.languages)) {
    return false
  }

  const configuredCodes = useRuntimeConfig().pruvious.i18n.languages.map(({ code }: { code: string }) => code)
  if (
    index.languages.length !== configuredCodes.length ||
    !configuredCodes.every((code: string) => index.languages.includes(code))
  ) {
    return false
  }

  // `builtAt` precedes the build's reads, so a same-millisecond flush must rebuild.
  return !isNumber(flushedAt) || index.builtAt > flushedAt
}

/**
 * Rebuilds and persists the link index under a database lock. If the lock cannot be acquired the
 * index is still built and persisted - storing a complete build heals the cache.
 */
async function rebuildLinkIndexLocked(db: Db): Promise<LinkIndex> {
  const acquired = await db.lock(LINK_INDEX_LOCK_KEY, LINK_INDEX_LOCK_TIMEOUT)

  try {
    if (acquired) {
      const { linkIndex, linkIndexFlushedAt } = await db.getOptions([LINK_INDEX_KEY, LINK_INDEX_FLUSHED_AT_KEY])

      if (isFresh(linkIndex, linkIndexFlushedAt)) {
        return linkIndex
      }
    }

    const builtAt = Date.now()
    const fresh = await buildLinkIndex(db)
    fresh.builtAt = builtAt

    try {
      await db.setOption(LINK_INDEX_KEY, fresh)
    } catch {}

    return fresh
  } finally {
    if (acquired) {
      try {
        await db.unlock(LINK_INDEX_LOCK_KEY)
      } catch {}
    }
  }
}

function tryUseEvent(): any {
  try {
    return useEvent()
  } catch {
    return undefined
  }
}

/** Returns the link index, rebuilding on demand when missing or stale. Memoized per request. */
export async function getLinkIndex(): Promise<LinkIndex> {
  const event = tryUseEvent()

  if (event?.context?.pruviousLinkIndex) {
    return event.context.pruviousLinkIndex as LinkIndex
  }

  const db = database()
  const { linkIndex, linkIndexFlushedAt } = await db.getOptions([LINK_INDEX_KEY, LINK_INDEX_FLUSHED_AT_KEY])
  const index = isFresh(linkIndex, linkIndexFlushedAt) ? linkIndex : await rebuildLinkIndexLocked(db)

  if (event?.context) {
    event.context.pruviousLinkIndex = index
  }

  return index
}

/** Marks the link index stale. Never throws - safe to call from an `afterQueryExecution` hook. */
export async function flushLinkIndex(): Promise<void> {
  try {
    await database().setOption(LINK_INDEX_FLUSHED_AT_KEY, Date.now())

    const event = tryUseEvent()
    if (event?.context?.pruviousLinkIndex) {
      delete event.context.pruviousLinkIndex
    }
  } catch {}
}

/** Resolves the route/record components of a `rel://` URL to a public URL path. */
export function resolveRelURLFromIndex(
  index: LinkIndex,
  parts: { routeId: number; collection?: string; recordId?: number; language: string },
  opts: { includeDrafts: boolean },
): string | null {
  const { primaryLanguage, prefixPrimaryLanguage } = useRuntimeConfig().pruvious.i18n
  const language = parts.language
  const route = index.routes.find((r) => r.id === parts.routeId)

  if (!route) {
    return null
  }

  const routePath = route.path[language]

  if (!isString(routePath)) {
    return null
  }

  if (!opts.includeDrafts && route.isPublic[language] !== true) {
    return null
  }

  const languagePrefix = language !== primaryLanguage || prefixPrimaryLanguage ? `/${language}` : ''

  if (parts.collection && isDefined(parts.recordId)) {
    const collection = collections[parts.collection as keyof Collections] as any
    const translatable = !!collection?.meta?.translatable
    const record = (index.records[parts.collection] ?? []).find(
      (rec) => rec.id === parts.recordId && (!translatable || rec.language === language),
    )

    if (!record) {
      return null
    }

    if (!opts.includeDrafts && !record.isPublic) {
      return null
    }

    return normalizeRoutePath(`${languagePrefix}/${routePath}/${record.subpath}`)
  }

  return normalizeRoutePath(`${languagePrefix}${routePath}`)
}

/** Returns the records sharing a translation group with `record` (including `record` itself). */
export function getRecordTranslations(
  index: LinkIndex,
  collectionName: string,
  record: LinkIndexRecord,
): LinkIndexRecord[] {
  if (isNull(record.translations)) {
    return [record]
  }

  return (index.records[collectionName] ?? []).filter((rec) => rec.translations === record.translations)
}
