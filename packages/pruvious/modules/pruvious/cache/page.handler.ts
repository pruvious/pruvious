import {
  buildPageCacheKey,
  collections,
  getLinkIndex,
  getPageCacheEntry,
  getToken,
  resolveCacheRule,
  tryMarkPagePending,
  type LanguageCode,
  type RawCacheRule,
} from '#pruvious/server'
import { isNotNull, isString, sleep, withLeadingSlash, withoutTrailingSlash } from '@pruvious/utils'
import { defineEventHandler, setResponseHeader } from 'h3'

const STATIC_EXTENSIONS =
  /\.(?:js|mjs|css|map|json|webmanifest|ico|png|jpe?g|gif|svg|webp|avif|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|pdf|txt|xml)$/i

export default defineEventHandler(async (event) => {
  const { pruvious } = useRuntimeConfig()

  if (!pruvious.cache.page.enabled) {
    return
  }

  if (event.method !== 'GET' && event.method !== 'HEAD') {
    return
  }

  const path = event.path.split('?')[0]!

  if (isExcludedPath(path, pruvious)) {
    return
  }

  if (isNotNull(getToken())) {
    setResponseHeader(event, 'Cache-Control', 'private, no-store')
    setResponseHeader(event, 'Vary', 'Cookie, Authorization')
    if (pruvious.cache.page.headers) {
      setResponseHeader(event, 'X-Pruvious-Cache', 'BYPASS-AUTH')
    }
    return
  }

  const { language, normalizedPath } = await detectLanguage(path)

  const index = await getLinkIndex().catch(() => null)
  if (!index) {
    return
  }

  const resolved = resolveCanonicalParts(index, normalizedPath, language)
  if (!resolved) {
    return
  }

  const { route, canonicalSubpath } = resolved
  const storedRoutePath = route.path[language] ?? ''

  if (!isCanonicalRequest(path, storedRoutePath, canonicalSubpath, language)) {
    return
  }

  const cacheRules = (route.cacheRules?.[language] ?? []) as RawCacheRule[]
  const subpath = withLeadingSlash(canonicalSubpath || '/')

  const rule = resolveCacheRule(cacheRules, subpath, {
    action: pruvious.cache.page.default,
    ttl: pruvious.cache.page.defaultTTL,
    debounce: pruvious.cache.page.defaultDebounce,
    timeout: pruvious.cache.page.defaultTimeout,
    queryString: pruvious.cache.page.defaultQueryString,
  })

  if (rule.action === 'bypass') {
    if (pruvious.cache.page.headers) {
      setResponseHeader(event, 'X-Pruvious-Cache', 'BYPASS-RULE')
    }
    return
  }

  const rawQuery = event.path.includes('?') ? event.path.slice(event.path.indexOf('?') + 1) : ''
  const key = buildPageCacheKey(language, normalizedPath, rawQuery, rule)

  if (!key) {
    if (pruvious.cache.page.headers) {
      setResponseHeader(event, 'X-Pruvious-Cache', 'BYPASS-QS')
    }
    return
  }

  const hit = await getPageCacheEntry(key).catch(() => null)
  if (hit && hit.value) {
    setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    setResponseHeader(event, 'Cache-Control', 'public, max-age=0, must-revalidate')
    setResponseHeader(event, 'Vary', 'Cookie, Authorization')
    if (pruvious.cache.page.headers) {
      setResponseHeader(event, 'X-Pruvious-Cache', 'HIT')
    }
    return hit.value
  }

  const token = await tryMarkPagePending(key, rule.timeout).catch(() => null)

  if (!token && rule.debounce > 0) {
    const waited = await waitForPageEntry(key, rule.debounce)
    if (waited) {
      setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
      setResponseHeader(event, 'Cache-Control', 'public, max-age=0, must-revalidate')
      setResponseHeader(event, 'Vary', 'Cookie, Authorization')
      if (pruvious.cache.page.headers) {
        setResponseHeader(event, 'X-Pruvious-Cache', 'HIT')
      }
      return waited
    }
  }

  ;(event.context as any).pruviousPageCache = token ? { key, token, ttl: rule.ttl } : null

  setResponseHeader(event, 'Cache-Control', 'public, max-age=0, must-revalidate')
  setResponseHeader(event, 'Vary', 'Cookie, Authorization')

  if (pruvious.cache.page.headers) {
    setResponseHeader(event, 'X-Pruvious-Cache', token ? 'MISS' : 'BYPASS-LOCK')
  }
})

function isExcludedPath(path: string, pruvious: ReturnType<typeof useRuntimeConfig>['pruvious']): boolean {
  if (path === '/favicon.ico' || path === '/robots.txt' || path === '/sitemap.xml') {
    return true
  }

  if (/^\/sitemap-\d+\.xml$/i.test(path)) {
    return true
  }

  if (path === '/_pruviousPreview' || path.startsWith('/_pruviousPreview/')) {
    return true
  }

  if (path.startsWith('/_nuxt/') || path === '/_nuxt') {
    return true
  }

  if (
    path === '/_payload.json' ||
    path === '/_payload.js' ||
    path.endsWith('/_payload.json') ||
    path.endsWith('/_payload.js')
  ) {
    return true
  }

  if (path === '/__nuxt_error' || path.startsWith('/__nuxt_error/') || path.startsWith('/__nuxt_island/')) {
    return true
  }

  if (matchesBasePath(path, pruvious.dashboard.basePath)) {
    return true
  }

  if (matchesBasePath(path, pruvious.api.basePath)) {
    return true
  }

  if (matchesBasePath(path, pruvious.uploads.basePath)) {
    return true
  }

  if (STATIC_EXTENSIONS.test(path)) {
    return true
  }

  return false
}

function matchesBasePath(path: string, basePath: string): boolean {
  const trimmed = withoutTrailingSlash(basePath)
  return path === trimmed || path.startsWith(basePath)
}

async function detectLanguage(path: string): Promise<{ language: LanguageCode; normalizedPath: string }> {
  const { i18n } = useRuntimeConfig().pruvious
  const subpaths = path.split('/').filter(Boolean)
  const firstSegment = subpaths[0]?.toLowerCase()
  const matchedLanguage = i18n.languages.find(({ code }) => code.toLowerCase() === firstSegment)
  const language = (matchedLanguage?.code ?? i18n.primaryLanguage) as LanguageCode

  const rest = matchedLanguage ? subpaths.slice(1) : subpaths
  const normalized = rest.length ? `/${rest.join('/').toLowerCase()}` : '/'

  return { language, normalizedPath: normalized }
}

/**
 * Returns `true` when the raw request path matches the canonical form (route case, record subpath
 * case, language prefix, and trailing-slash convention) so cached entries are not served for URLs
 * that `resolveRoute` would soft-redirect away from.
 *
 * Regional codes use their registered casing in the canonical prefix (`/de-AT/...`), so a
 * `/de-at/...` request takes one soft-redirect roundtrip before hitting the cache.
 */
function isCanonicalRequest(
  rawPath: string,
  storedRoutePath: string,
  canonicalSubpath: string,
  language: LanguageCode,
): boolean {
  const { i18n, routing } = useRuntimeConfig().pruvious
  const needsPrefix = language !== i18n.primaryLanguage || i18n.prefixPrimaryLanguage
  const prefix = needsPrefix ? `/${language}` : ''
  const routePart = storedRoutePath === '/' ? '' : storedRoutePath
  const subpathPart = canonicalSubpath ? `/${canonicalSubpath}` : ''
  let canonical = `${prefix}${routePart}${subpathPart}` || '/'

  if (routing.trailingSlash) {
    if (canonical !== '/' && !canonical.endsWith('/')) {
      canonical += '/'
    }
  } else if (canonical !== '/' && canonical.endsWith('/')) {
    canonical = canonical.slice(0, -1)
  }

  return rawPath === canonical
}

/**
 * Resolves the matched route and the canonical (stored-case) subpath for a lowercased request path.
 *
 * For routes that reference collections, looks up the matching record by lowercased subpath in the
 * link index and returns its stored subpath case. Returns `null` when no public route matches, when
 * the request points under a collection-backed route but no public record matches the subpath, or
 * when any candidate route has a redirect rule that would fire for this path (the middleware must
 * defer to `resolveRoute` so the redirect can be issued).
 */
function resolveCanonicalParts(
  index: Awaited<ReturnType<typeof getLinkIndex>>,
  normalizedPath: string,
  language: string,
): { route: Awaited<ReturnType<typeof getLinkIndex>>['routes'][number]; canonicalSubpath: string } | null {
  const segments = normalizedPath.split('/').filter(Boolean)
  const candidates: string[] = ['/']

  for (let i = 1; i <= segments.length; i++) {
    candidates.unshift(`/${segments.slice(0, i).join('/')}`)
  }

  const matchingRoutes: Array<{ route: Awaited<ReturnType<typeof getLinkIndex>>['routes'][number]; index: number }> = []
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!
    const route = index.routes.find((r) => {
      const stored = r.path[language]
      return isString(stored) && stored.toLowerCase() === candidate
    })
    if (route && route.isPublic[language]) {
      matchingRoutes.push({ route, index: i })
    }
  }

  if (!matchingRoutes.length) {
    return null
  }

  for (const { route } of matchingRoutes) {
    if (routeHasMatchingRedirect(route, normalizedPath, language)) {
      return null
    }
  }

  for (const { route } of matchingRoutes) {
    const routePath = route.path[language]!
    const subpathLower = normalizedPath.slice(routePath.length).replace(/^\/+/, '')

    if (route.referencedSingleton || !route.referencedCollections.length) {
      if (subpathLower) {
        continue
      }
      return { route, canonicalSubpath: '' }
    }

    for (const collectionName of route.referencedCollections) {
      const translatable = !!collections[collectionName as keyof typeof collections]?.meta?.translatable
      const records = index.records[collectionName] ?? []
      const record = records.find((rec) => {
        if (translatable && rec.language !== language) {
          return false
        }
        return rec.isPublic && rec.subpath.toLowerCase() === subpathLower
      })
      if (record) {
        return { route, canonicalSubpath: record.subpath }
      }
    }

    return null
  }

  return null
}

/**
 * Mirrors the redirect-rule evaluation in `resolveRoute`. Returns `true` when any redirect on this
 * route would fire for `normalizedPath` in the given language. The regex is created with the `i`
 * flag (matching `resolveRoute`) so casing in the subpath tail does not matter.
 */
function routeHasMatchingRedirect(
  route: Awaited<ReturnType<typeof getLinkIndex>>['routes'][number],
  normalizedPath: string,
  language: string,
): boolean {
  const rules = route.redirects?.[language] ?? []
  if (!rules.length) {
    return false
  }

  const routePath = route.path[language] ?? ''
  const subpathTail = normalizedPath.slice(routePath.length)

  for (const { match, to } of rules) {
    if (!isString(to) || !to) {
      continue
    }
    if (!match) {
      return true
    }
    try {
      if (new RegExp(match, 'im').test(subpathTail)) {
        return true
      }
    } catch {}
  }

  return false
}

async function waitForPageEntry(key: string, debounceMs: number): Promise<string | null> {
  const start = Date.now()
  const pollInterval = Math.min(50, Math.max(10, Math.floor(debounceMs / 5)))

  while (Date.now() - start < debounceMs) {
    await sleep(pollInterval)
    const entry = await getPageCacheEntry(key).catch(() => null)
    if (entry && entry.value && !entry.pending) {
      return entry.value
    }
  }

  return null
}
