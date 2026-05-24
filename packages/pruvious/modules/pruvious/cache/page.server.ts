import { Database } from '@pruvious/orm'
import { isArray, isString } from '@pruvious/utils'
import { PathMatcher } from '@pruvious/utils/path-matcher'
import type { LanguageCode } from '#pruvious/server'

/**
 * Resolved cache rule for a route subpath, with all defaults applied.
 */
export interface ResolvedCacheRule {
  action: 'cache' | 'bypass'
  ttl: number | null
  debounce: number
  timeout: number
  queryString: 'separate' | 'ignore' | 'baseOnly' | 'whitelist'
  whitelistedParams: string[]
}

/**
 * Raw cache rule as stored in the Routes collection (per-language repeater item).
 */
export interface RawCacheRule {
  include: string
  exclude?: string | null
  action?: 'cache' | 'bypass'
  ttl?: number | null
  debounce?: number
  timeout?: number
  queryString?: 'separate' | 'ignore' | 'baseOnly' | 'whitelist'
  whitelistedParams?: string[] | null
}

/**
 * Picks the first matching rule for `subpath` from a route's `cacheRules{LANG}` repeater.
 *
 * Each rule's `include` glob is matched against `subpath`; if `exclude` is set and matches,
 * the rule is skipped. When no rule matches, the module-level default action is returned.
 */
export function resolveCacheRule(
  rules: RawCacheRule[] | null | undefined,
  subpath: string,
  defaults: {
    action: 'cache' | 'bypass'
    ttl: number | null
    debounce: number
    timeout: number
    queryString: 'separate' | 'ignore' | 'baseOnly'
  },
): ResolvedCacheRule {
  if (isArray(rules)) {
    for (const rule of rules) {
      if (!rule || !isString(rule.include)) {
        continue
      }
      const matcher = new PathMatcher({
        include: [rule.include],
        exclude: isString(rule.exclude) && rule.exclude ? [rule.exclude] : [],
      })
      if (matcher.test(subpath)) {
        return {
          action: rule.action ?? defaults.action,
          ttl: rule.ttl === undefined ? defaults.ttl : rule.ttl,
          debounce: rule.debounce ?? defaults.debounce,
          timeout: rule.timeout ?? defaults.timeout,
          queryString: rule.queryString ?? defaults.queryString,
          whitelistedParams: isArray(rule.whitelistedParams) ? rule.whitelistedParams : [],
        }
      }
    }
  }

  return {
    action: defaults.action,
    ttl: defaults.ttl,
    debounce: defaults.debounce,
    timeout: defaults.timeout,
    queryString: defaults.queryString,
    whitelistedParams: [],
  }
}

/**
 * Builds the cache key for a given language, normalized path, and raw query string.
 *
 * Path is lowercased and the query string is canonicalized (sorted keys, deduplicated)
 * so equivalent requests resolve to the same key.
 *
 * Returns `null` when the rule's `queryString` mode requires bypass (`baseOnly` with a non-empty query).
 */
export function buildPageCacheKey(
  language: LanguageCode,
  normalizedPath: string,
  rawQuery: string,
  rule: ResolvedCacheRule,
): string | null {
  const pathPart = normalizedPath.toLowerCase()
  const querySig = canonicalizeQueryString(rawQuery, rule)

  if (querySig === null) {
    return null
  }

  return querySig ? `page:${language}:${pathPart}:q=${querySig}` : `page:${language}:${pathPart}`
}

/**
 * Normalizes a raw URL query string into a stable signature according to the rule's `queryString` mode.
 *
 * Returns `null` when the request must skip cache entirely (mode `baseOnly` with a non-empty query),
 * an empty string when no query dimension applies, or a sorted `key=value&...` string.
 */
function canonicalizeQueryString(rawQuery: string, rule: ResolvedCacheRule): string | null {
  if (!rawQuery) {
    return ''
  }

  if (rule.queryString === 'ignore') {
    return ''
  }

  const params = new URLSearchParams(rawQuery)
  const entries: [string, string][] = []

  if (rule.queryString === 'baseOnly') {
    return params.toString() ? null : ''
  }

  const allow = rule.queryString === 'whitelist' ? new Set(rule.whitelistedParams) : null

  for (const [key, value] of params.entries()) {
    if (allow && !allow.has(key)) {
      continue
    }
    entries.push([key, value])
  }

  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

  const sp = new URLSearchParams()
  for (const [k, v] of entries) {
    sp.append(k, v)
  }
  return sp.toString()
}

/**
 * Drops every page cache entry across all languages and paths. Idempotent.
 */
export async function clearPageCache(): Promise<number> {
  const { clearCache } = await import('./utils.server')
  return clearCache('page')
}

/**
 * Drops page cache entries whose stored path matches any of the given globs.
 *
 * The match is run against the language-prefixed normalized path component of the key.
 * Globs use `zeptomatch` syntax (e.g. `'/blog/**'`).
 */
export async function clearPageCachePaths(paths: string[]): Promise<number> {
  if (!paths.length || paths.includes('**')) {
    return clearPageCache()
  }

  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()
  const { prefix } = useRuntimeConfig().pruvious.cache
  const fullPrefix = prefix ? `${prefix}:` : ''
  const matcher = new PathMatcher({ include: paths })
  const matchedFullKeys: string[] = []

  if (db instanceof Database) {
    const rows = await db.exec(`select "key" from "Cache" where "key" like $like`, { like: `${fullPrefix}page:%` })
    for (const row of rows) {
      const fullKey = row.key as string
      const subpath = extractPathFromCacheKey(fullKey.slice(fullPrefix.length))
      if (subpath && matcher.test(subpath)) {
        matchedFullKeys.push(fullKey)
      }
    }
  } else {
    const keys = await db.keys(`${fullPrefix}page:*`)
    for (const fullKey of keys) {
      const subpath = extractPathFromCacheKey(fullKey.slice(fullPrefix.length))
      if (subpath && matcher.test(subpath)) {
        matchedFullKeys.push(fullKey)
      }
    }
  }

  if (!matchedFullKeys.length) {
    return 0
  }

  const BATCH = 500
  let cleared = 0

  if (db instanceof Database) {
    for (let i = 0; i < matchedFullKeys.length; i += BATCH) {
      const chunk = matchedFullKeys.slice(i, i + BATCH)
      const placeholders = chunk.map((_, idx) => `$k${idx}`).join(', ')
      const params = Object.fromEntries(chunk.map((k, idx) => [`k${idx}`, k]))
      cleared += await db.exec(`delete from "Cache" where "key" in (${placeholders})`, params)
    }
  } else {
    for (let i = 0; i < matchedFullKeys.length; i += BATCH) {
      cleared += await db.del(...matchedFullKeys.slice(i, i + BATCH))
    }
  }

  return cleared
}

/**
 * Extracts the normalized path component (with language stripped) from a `page:{lang}:{path}[:q=...]` key.
 * Returns `null` for malformed keys.
 */
function extractPathFromCacheKey(key: string): string | null {
  if (!key.startsWith('page:') || key.startsWith('page:pending:')) {
    return null
  }
  const withoutNamespace = key.slice('page:'.length)
  const firstColon = withoutNamespace.indexOf(':')
  if (firstColon < 1) {
    return null
  }
  const afterLang = withoutNamespace.slice(firstColon + 1)
  const qIndex = afterLang.indexOf(':q=')
  return qIndex >= 0 ? afterLang.slice(0, qIndex) : afterLang
}
