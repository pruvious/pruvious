import {
  collections,
  getRouteReferences,
  hasPermission,
  selectFrom,
  selectSingleton,
  type Collections,
  type LanguageCode,
  type LanguageSuffix,
  type RouteReferenceName,
  type RouteReferences,
  type Singletons,
} from '#pruvious/server'
import type { ExtractCastedTypes, ExtractPopulatedTypes, GenericField } from '@pruvious/orm'
import {
  buildRelURL,
  isArray,
  isDefined,
  isNotNull,
  isNull,
  isObject,
  isPositiveInteger,
  isRelURL,
  isString,
  langSuffix,
  parseRelURL,
  pick,
  withLeadingSlash,
  withoutTrailingSlash,
  withTrailingSlash,
  type ParsedRelURL,
} from '@pruvious/utils'
import type { LayoutKey } from 'nuxt/app'
import { joinURL } from 'ufo'
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
   * Indicates whether the collection or singleton can be referenced by a `Routes` record.
   * Containers that opt out (e.g. patterns) still support live preview but are hidden from the
   * route's reference picker. Singletons are always referenceable.
   */
  referenceable?: boolean

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

export interface ResolvedRouteSharingImage {
  /**
   * The URL of the sharing image.
   * Includes the SEO singleton's `baseURL` when configured, so it is safe to use as `og:image` content.
   */
  url: string

  /**
   * The MIME type of the image.
   */
  mime: string

  /**
   * The image width in pixels, or `null` for vector formats.
   */
  width: number | null

  /**
   * The image height in pixels, or `null` for vector formats.
   */
  height: number | null

  /**
   * The image description used as alt text and the `og:image:alt` value.
   */
  alt: string
}

export interface ResolvedRouteImage {
  /**
   * The absolute URL of the image, prefixed with the SEO `baseURL` when configured.
   */
  url: string

  /**
   * The MIME type of the image.
   */
  mime: string

  /**
   * The image width in pixels, or `null` for vector formats.
   */
  width: number | null

  /**
   * The image height in pixels, or `null` for vector formats.
   */
  height: number | null
}

export interface ResolvedRouteAlternate {
  /**
   * The BCP47 language tag (e.g. `en`, `de`) or the literal `'x-default'`.
   */
  hreflang: string

  /**
   * The absolute URL of the alternate. Includes the SEO `baseURL` when configured.
   */
  href: string
}

export interface ResolvedRouteMetaTag {
  /**
   * The attribute used to identify the meta tag (e.g. `name`, `property`, `http-equiv`).
   */
  attribute: 'name' | 'property' | 'http-equiv'

  /**
   * The value of the identifying attribute (e.g. `og:type`, `description`, `twitter:card`).
   */
  key: string

  /**
   * The value of the meta tag's `content` attribute.
   */
  content: string
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
   * The absolute URL used for the canonical link, `og:url`, and JSON-LD `WebPage.url`.
   *
   * When a `canonicalURL` override is set on the per-record or per-route SEO, this is the resolved
   * override (external URL as-is, or `baseURL + resolved internal path`). Otherwise it is the
   * auto-derived URL (`baseURL + realPath`).
   */
  url: string

  /**
   * The auto-derived URL of the page (`baseURL + realPath`), ignoring any `canonicalURL` override.
   * Useful when you need the page's own URL even when canonical points elsewhere.
   */
  autoURL: string

  /**
   * `true` when the user has supplied a non-empty `canonicalURL` on this route or record, regardless
   * of whether it resolves successfully or self-resolves to `autoURL`. When `true`:
   *
   * - `alternates` is `[]` (Google focuses on the canonical and ignores `hreflang` on duplicates)
   * - the route/record is excluded from the sitemap
   * - `url` may still equal `autoURL` (broken `rel://` falls back) but the intent to override
   *   stands
   */
  hasCanonicalOverride: boolean

  /**
   * Indicates whether the route is indexable by search engines.
   */
  isIndexable: boolean

  /**
   * The resolved sharing image used by Open Graph and Twitter cards.
   * Resolved with `record.seo.sharingImage > route.seo{LANG}.sharingImage > SEO.sharingImage` precedence.
   */
  sharingImage: ResolvedRouteSharingImage | null

  /**
   * Additional meta tags rendered in the document head.
   * Entries are deduplicated by `attribute:key`; per-record entries override per-route entries, which override the SEO singleton's entries.
   */
  metaTags: ResolvedRouteMetaTag[]

  /**
   * The site name used for `og:site_name` and as the `Organization`/`WebSite` name in JSON-LD.
   */
  siteName: string

  /**
   * The resolved `og:type` value for the current page, derived from the merged `metaTags` entries.
   * Falls back to `'website'` when no `og:type` meta tag is present in any layer.
   */
  ogType: string

  /**
   * The site logo from the SEO singleton, used in the JSON-LD `Organization` entry.
   */
  logo: ResolvedRouteImage | null

  /**
   * The site favicon from the SEO singleton, rendered as `<link rel="icon">`.
   */
  favicon: ResolvedRouteImage | null

  /**
   * Public URLs of the official social profiles, used as `sameAs` entries in JSON-LD.
   */
  socialLinks: string[]

  /**
   * The alternate URLs for every configured language, including a self-referential entry and an `x-default` pointing at the primary language.
   * Empty when the SEO `baseURL` is not configured or when `hasCanonicalOverride` is `true`.
   */
  alternates: ResolvedRouteAlternate[]

  /**
   * Pre-rendered structured data objects to emit as `<script type="application/ld+json">`.
   * Always includes a `WebSite` and `WebPage` entry; adds an `Organization` entry when the singleton has identity information.
   */
  jsonLd: Record<string, any>[]
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
   * The id of the referenced collection record.
   * Only set when `ref` points to a collection; singletons leave this `undefined`.
   */
  recordId?: number

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
   * Whether to return only routes and records that are indexable by search engines.
   *
   * Excludes:
   *
   * - routes/records flagged as not indexable in their per-language SEO,
   * - all routes when the SEO singleton's master switch hides the site (for the given language),
   * - routes/records that set a `canonicalURL` override (those advertise themselves as duplicates).
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

  /**
   * The language code of this entry (matches `path`'s language prefix).
   */
  language: LanguageCode

  /**
   * Epoch milliseconds of the last update to the underlying route or record.
   * `null` when no `updatedAt` field is available on the source data container.
   */
  updatedAt: number | null
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

interface PopulatedSharingImage {
  id: number
  path: string
  mime: string
  size?: number
  description?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
}

interface RawMetaTag {
  attribute: 'name' | 'property' | 'http-equiv' | (string & {})
  key: string | null
  content: string | null
}

const META_ATTRIBUTES = ['name', 'property', 'http-equiv'] as const

/**
 * Builds a `ResolvedRouteSharingImage` from a populated `Uploads` record.
 *
 * Returns `null` when no image is provided. The resulting `url` is absolute when `seoBaseURL` is
 * set, otherwise it is a root-relative path.
 */
function toResolvedSharingImage(
  image: PopulatedSharingImage | null | undefined,
  seoBaseURL: string,
  appBaseURL: string,
  uploadsBasePath: string,
): ResolvedRouteSharingImage | null {
  if (!image || !image.path) {
    return null
  }
  return {
    url: joinURL(seoBaseURL, appBaseURL, uploadsBasePath, image.path),
    mime: image.mime,
    width: image.imageWidth ?? null,
    height: image.imageHeight ?? null,
    alt: image.description ?? '',
  }
}

/**
 * Picks the highest-priority sharing image from the given sources.
 *
 * Sources are listed from lowest to highest priority - later entries win when they are not null.
 */
function pickSharingImage(...sources: (PopulatedSharingImage | null | undefined)[]): PopulatedSharingImage | null {
  let result: PopulatedSharingImage | null = null
  for (const src of sources) {
    if (src && src.path) {
      result = src
    }
  }
  return result
}

/**
 * Forces `property` for Open-Graph-family keys (`og:*`, `fb:*`, `article:*`, `book:*`, `profile:*`,
 * `music:*`, `video:*`) and `name` for Twitter Card keys (`twitter:*`), regardless of the attribute
 * the user picked in the dashboard. These specs are unambiguous about which attribute to use, and
 * picking the wrong one means the meta tag is silently ignored by the consuming platform.
 */
function normalizeMetaAttribute(attribute: string, key: string): 'name' | 'property' | 'http-equiv' {
  if (/^(og|fb|article|book|profile|music|video|business|restaurant|place):/.test(key)) {
    return 'property'
  }
  if (key.startsWith('twitter:')) {
    return 'name'
  }
  return (META_ATTRIBUTES as readonly string[]).includes(attribute)
    ? (attribute as 'name' | 'property' | 'http-equiv')
    : 'name'
}

/**
 * Merges meta tag lists with dedup-by-`attribute:key` semantics.
 *
 * Sources are listed from lowest to highest priority - later entries override matching earlier
 * ones. Entries with missing key or content are skipped.
 */
function composeMetaTags(...sources: (RawMetaTag[] | null | undefined)[]): ResolvedRouteMetaTag[] {
  const merged = new Map<string, ResolvedRouteMetaTag>()
  for (const list of sources) {
    if (!list) {
      continue
    }
    for (const tag of list) {
      const key = (tag.key ?? '').trim()
      let content = tag.content ?? ''
      if (!key || !content) {
        continue
      }
      const attribute = normalizeMetaAttribute(tag.attribute ?? '', key)
      if (attribute === 'property' && key === 'og:type') {
        content = content.toLowerCase()
      }
      merged.set(`${attribute}:${key}`, { attribute, key, content })
    }
  }
  return Array.from(merged.values())
}

/**
 * Resolves a per-route or per-record `canonicalURL` override to an absolute URL.
 *
 * The input is the populated value of a `linkField` (either `null` when the user did not set the
 * field, or `{ url: string | undefined, ... }` where `url` is an external `https://` URL, a
 * resolved internal path (`/foo`), or `undefined` when an internal `rel://` link points to a
 * deleted target).
 *
 * Returns `null` when the override resolves to nothing (unset or broken link), or the absolute
 * URL (external as-is, internal prefixed with `seoBaseURL`).
 */
function resolveCanonicalOverride(
  populatedLink: { url?: string | null } | null | undefined,
  seoBaseURL: string,
): string | null {
  const raw = populatedLink?.url
  if (!isString(raw) || !raw) {
    return null
  }
  if (/^https?:\/\//.test(raw)) {
    return raw
  }
  return withoutTrailingSlash(seoBaseURL) + (raw === '/' ? '' : raw)
}

/**
 * Returns `true` when the user has supplied any non-empty `canonicalURL` on the populated SEO,
 * regardless of whether the link resolves (e.g., a `rel://` whose target was deleted still
 * counts). Matches `LinkIndex*.hasCanonicalOverride` so sitemap exclusion and on-page
 * `hreflang`/canonical behavior stay in sync.
 */
function hasCanonicalOverrideSet(populatedLink: { url?: string | null } | null | undefined): boolean {
  return populatedLink !== null && populatedLink !== undefined
}

/**
 * Builds a `ResolvedRouteImage` from a populated `Uploads` record.
 *
 * Returns `null` when no image is provided. The resulting `url` is absolute when `seoBaseURL`
 * is set, otherwise it is a root-relative path.
 */
function toResolvedImage(
  image: PopulatedSharingImage | null | undefined,
  seoBaseURL: string,
  appBaseURL: string,
  uploadsBasePath: string,
): ResolvedRouteImage | null {
  if (!image || !image.path) {
    return null
  }
  return {
    url: joinURL(seoBaseURL, appBaseURL, uploadsBasePath, image.path),
    mime: image.mime,
    width: image.imageWidth ?? null,
    height: image.imageHeight ?? null,
  }
}

/**
 * Builds the `<link rel="alternate" hreflang>` entries for a resolved route, including a
 * self-referential entry and an `x-default` pointing at the primary language version.
 *
 * Returns an empty array when the SEO `baseURL` is not configured, since hreflang requires
 * absolute URLs.
 */
function composeAlternates(
  currentLanguage: string,
  primaryLanguage: string,
  realPath: string,
  translations: Record<string, string | null>,
  seoBaseURL: string,
): ResolvedRouteAlternate[] {
  if (!seoBaseURL) {
    return []
  }
  const base = withoutTrailingSlash(seoBaseURL)
  const toHref = (path: string) => base + (path === '/' ? '' : path)
  const result: ResolvedRouteAlternate[] = []
  const selfHref = toHref(realPath)
  result.push({ hreflang: currentLanguage, href: selfHref })
  let primaryHref = currentLanguage === primaryLanguage ? selfHref : null
  for (const [code, path] of Object.entries(translations)) {
    if (code === currentLanguage || !isString(path)) {
      continue
    }
    const href = toHref(path)
    result.push({ hreflang: code, href })
    if (code === primaryLanguage) {
      primaryHref = href
    }
  }
  if (primaryHref) {
    result.push({ hreflang: 'x-default', href: primaryHref })
  }
  return result
}

/**
 * Builds the baseline structured data emitted on every page:
 * `Organization` and `WebSite` from the SEO singleton, plus a per-page `WebPage` (or
 * `Article` when `ogType` is `article`).
 *
 * Identity entries are skipped when the SEO singleton lacks `baseURL` or `baseTitle`,
 * since the resulting URLs/names would be ambiguous.
 */
function composeJsonLd(opts: {
  language: string
  pageUrl: string
  title: string
  description: string
  siteName: string
  baseURL: string
  logo: ResolvedRouteImage | null
  socialLinks: string[]
  ogType: string
  sharingImage: ResolvedRouteSharingImage | null
}): Record<string, any>[] {
  const result: Record<string, any>[] = []
  const { language, pageUrl, title, description, siteName, baseURL, logo, socialLinks, ogType, sharingImage } = opts
  const hasIdentity = !!(baseURL && siteName)

  if (hasIdentity) {
    const organization: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': siteName,
      'url': baseURL,
    }
    if (logo) {
      organization.logo = {
        '@type': 'ImageObject',
        'url': logo.url,
        ...(logo.width ? { width: logo.width } : {}),
        ...(logo.height ? { height: logo.height } : {}),
      }
    }
    if (socialLinks.length) {
      organization.sameAs = socialLinks
    }
    result.push(organization)

    result.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': siteName,
      'url': baseURL,
      'inLanguage': language,
    })
  }

  const isArticle = ogType === 'article'
  const page: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': isArticle ? 'Article' : 'WebPage',
    'url': pageUrl,
    'name': title,
    'inLanguage': language,
  }
  if (description) {
    page.description = description
  }
  if (sharingImage) {
    page.image = sharingImage.url
  }
  if (isArticle && hasIdentity) {
    const publisher: Record<string, any> = { '@type': 'Organization', 'name': siteName }
    if (logo) {
      publisher.logo = { '@type': 'ImageObject', 'url': logo.url }
    }
    page.publisher = publisher
  }
  result.push(page)

  return result
}

/**
 * Composes a `ResolvedRouteSEO` from the SEO singleton, the per-language route entry, and an
 * optional per-record SEO object.
 *
 * Inheritance precedence (lowest to highest):
 *
 * - `baseSEO` (the SEO singleton, per current language)
 * - `routeSEO` (the per-language `seo{LANG}` of the matched `Routes` row)
 * - `recordSEO` (only present when the route resolves to a collection record)
 */
function buildResolvedSEO(opts: {
  language: string
  primaryLanguage: string
  realPath: string
  translations: Record<string, string | null>
  baseSEO: Record<string, any>
  routeSEO: Record<string, any> | null | undefined
  recordSEO?: Record<string, any> | null | undefined
  appBaseURL: string
  uploadsBasePath: string
}): ResolvedRouteSEO {
  const {
    language,
    primaryLanguage,
    realPath,
    translations,
    baseSEO,
    routeSEO,
    recordSEO,
    appBaseURL,
    uploadsBasePath,
  } = opts
  const seoBaseURL = (baseSEO.baseURL as string | undefined) ?? ''

  const pageTitle = (recordSEO?.title as string | undefined) || (routeSEO?.title as string | undefined) || ''
  const showBaseTitle =
    (recordSEO?.baseTitle as boolean | undefined) ?? (routeSEO?.baseTitle as boolean | undefined) ?? true
  const baseTitle = (baseSEO.baseTitle as string | undefined) ?? ''
  const titleSeparator = (baseSEO.titleSeparator as string | undefined) ?? ' | '
  const title = pageTitle
    ? showBaseTitle && baseTitle
      ? baseSEO.baseTitlePosition === 'before'
        ? baseTitle + titleSeparator + pageTitle
        : pageTitle + titleSeparator + baseTitle
      : pageTitle
    : baseTitle

  const description =
    (recordSEO?.description as string | undefined) || (routeSEO?.description as string | undefined) || ''
  const autoURL = seoBaseURL + (realPath === '/' ? '' : realPath)
  const populatedCanonical =
    recordSEO !== undefined ? ((recordSEO?.canonicalURL as any) ?? null) : ((routeSEO?.canonicalURL as any) ?? null)
  const hasCanonicalOverride = hasCanonicalOverrideSet(populatedCanonical)
  const url = resolveCanonicalOverride(populatedCanonical, seoBaseURL) ?? autoURL
  const isIndexable =
    baseSEO.isIndexable !== false &&
    (routeSEO?.isIndexable ?? true) !== false &&
    (recordSEO?.isIndexable ?? true) !== false

  const sharingImage = toResolvedSharingImage(
    pickSharingImage(baseSEO.sharingImage as any, routeSEO?.sharingImage as any, recordSEO?.sharingImage as any),
    seoBaseURL,
    appBaseURL,
    uploadsBasePath,
  )
  const metaTags = composeMetaTags(baseSEO.metaTags as any, routeSEO?.metaTags as any, recordSEO?.metaTags as any)

  const siteName = baseTitle
  const ogType = metaTags.find((tag) => tag.attribute === 'property' && tag.key === 'og:type')?.content ?? 'website'
  const logo = toResolvedImage(baseSEO.logo as any, seoBaseURL, appBaseURL, uploadsBasePath)
  const favicon = toResolvedImage(baseSEO.favicon as any, seoBaseURL, appBaseURL, uploadsBasePath)
  const socialLinks: string[] = isArray(baseSEO.socialLinks)
    ? (baseSEO.socialLinks as any[])
        .map((item) => (isObject(item) ? (item as any).url : item))
        .filter((u): u is string => isString(u) && u.length > 0)
    : []

  const alternates = hasCanonicalOverride
    ? []
    : composeAlternates(language, primaryLanguage, realPath, translations, seoBaseURL)
  const jsonLd = composeJsonLd({
    language,
    pageUrl: url,
    title,
    description,
    siteName,
    baseURL: seoBaseURL,
    logo,
    socialLinks,
    ogType,
    sharingImage,
  })

  return {
    title,
    description,
    url,
    autoURL,
    hasCanonicalOverride,
    isIndexable,
    sharingImage,
    metaTags,
    siteName,
    ogType,
    logo,
    favicon,
    socialLinks,
    alternates,
    jsonLd,
  }
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
  const uploadsBasePath = runtimeConfig.pruvious.uploads.basePath
  const appBaseURL = runtimeConfig.app.baseURL
  const language = (languages.find(({ code }) => subpaths[0]?.toLowerCase() === code.toLowerCase())?.code ??
    primaryLanguage) as LanguageCode
  const languagePrefix = language !== primaryLanguage || prefixPrimaryLanguage ? `/${language}` : ''
  const languageSuffix = langSuffix(language) as LanguageSuffix
  const normalizedRoutePath = normalizeRoutePath(
    subpaths[0]?.toLowerCase() === language.toLowerCase() ? subpaths.slice(1).join('/') : subpaths.join('/'),
    false,
  )
  const otherLanguages = languages.filter(({ code }) => code !== language)
  const otherLanguageSuffixes = otherLanguages.map(({ code }) => langSuffix(code) as LanguageSuffix)
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
      const query = selectFrom('Routes').where(`path${languageSuffix}` as any, 'ilike', tryPath)
      if (!hasPermission('preview-drafts')) {
        query.where(`isPublic${languageSuffix}` as any, '=', true)
      }
      return query
        .populate()
        .first()
        .then(({ data }) => data)
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
        const singletonData = (
          await selectSingleton(exactRoute.referencedSingleton)
            .select(Object.keys(singletonReference[1].publicFields) as any)
            .language(language)
            .populate()
            .get()
        ).data

        if (!singletonData) {
          return null
        }

        const routeSEO = exactRoute[`seo${languageSuffix}`]
        const realPath = normalizeRoutePath(languagePrefix + exactRoute[`path${languageSuffix}`])
        const translations = Object.fromEntries(
          otherLanguages.map(({ code }, i) => [
            code,
            isNotNull(exactRoute![`path${otherLanguageSuffixes[i]!}`]) &&
            (exactRoute![`isPublic${otherLanguageSuffixes[i]!}`] || hasPermission('preview-drafts'))
              ? normalizeRoutePath(code + exactRoute![`path${otherLanguageSuffixes[i]!}`])
              : null,
          ]),
        ) as Record<LanguageCode, string | null>

        return {
          language,
          translations,
          seo: buildResolvedSEO({
            language,
            primaryLanguage,
            realPath,
            translations,
            baseSEO: baseSEO as any,
            routeSEO: routeSEO as any,
            appBaseURL,
            uploadsBasePath,
          }),
          ref: singletonReference[0] as TRef,
          data: singletonData as any,
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

          // SQL identifiers must not contain hyphens, so `langSuffix(code)` is used throughout.
          const whereIsPublic = (suffix: string) =>
            collection.meta.routing.isPublic.enabled && !hasPermission('preview-drafts')
              ? ` and "${collectionName}_${suffix}"."isPublic" = 1`
              : ''

          for (const { code } of languages) {
            if (code !== language) {
              const otherSuffix = langSuffix(code)
              select.push(
                `(select "subpath" from "${collectionName}" as "${collectionName}_${otherSuffix}" where "${collectionName}_${otherSuffix}"."translations" = "${collectionName}"."translations" and "language" = '${code}'${whereIsPublic(otherSuffix)}) as "subpath_${otherSuffix}"`,
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

  const linkIndex = await getLinkIndex()

  for (const record of collectionRecords) {
    if (record?.data) {
      const { ref, collection, data, route } = record
      const basePath = route[`path${languageSuffix}`]
      const realPath = normalizeRoutePath(`${languagePrefix}/${basePath}/${data.subpath}`)
      const recordSEO = collection.meta.routing.seo.enabled ? data.seo : {}
      const routeSEO = route[`seo${languageSuffix}`]
      const recordId = (linkIndex.records[ref] ?? []).find(
        (r) => r.subpath === data.subpath && (!collection.meta.translatable || r.language === language),
      )?.id
      const translations = Object.fromEntries(
        otherLanguages.map(({ code }, i) => {
          const otherSuffix = otherLanguageSuffixes[i]!
          const otherBasePath = route[`path${otherSuffix}`]
          const otherSubpath = data[`subpath_${otherSuffix}`]
          const otherIsPublic = route[`isPublic${otherSuffix}`] || hasPermission('preview-drafts')
          return [
            code,
            isNotNull(otherBasePath) && isNotNull(otherSubpath) && otherIsPublic
              ? normalizeRoutePath(`${code}/${otherBasePath}/${otherSubpath}`)
              : null,
          ]
        }),
      ) as Record<LanguageCode, string | null>

      return {
        language,
        translations,
        seo: buildResolvedSEO({
          language,
          primaryLanguage,
          realPath,
          translations,
          baseSEO: baseSEO as any,
          routeSEO: routeSEO as any,
          recordSEO: recordSEO as any,
          appBaseURL,
          uploadsBasePath,
        }),
        ref,
        data: pick(data, collection.meta.routing.publicFields) as any,
        recordId,
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

  let singletonIndexable: Record<string, boolean> | null = null

  if (indexableOnly) {
    const map: Record<string, boolean> = {}
    await Promise.all(
      languages.map(async ({ code }) => {
        const data = (
          await selectSingleton('SEO')
            .language(code as LanguageCode)
            .populate()
            .get()
        ).data
        map[code] = data?.isIndexable !== false
      }),
    )
    if (languages.every(({ code }) => !map[code])) {
      return { data: [], currentPage: page, lastPage: 1, perPage, total: 0 }
    }
    singletonIndexable = map
  }

  const index = await getLinkIndex()

  const routePathInLanguage = (route: LinkIndexRoute, code: string): string | null => {
    const path = route.path[code] ?? null
    if (isNull(path) || (!includeDrafts && route.isPublic[code] !== true)) {
      return null
    }
    if (
      indexableOnly &&
      (route.isIndexable[code] !== true || (singletonIndexable && singletonIndexable[code] !== true))
    ) {
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
        const singletonExcluded = indexableOnly && route.hasCanonicalOverride[language] === true
        if (!singletonExcluded) {
          languageEntries.push({
            path: normalizeRoutePath(languagePrefix + basePath),
            language: language as LanguageCode,
            updatedAt: route.updatedAt,
            translations: Object.fromEntries(
              otherLanguages.map(({ code }) => {
                const otherPath = routePathInLanguage(route, code)
                return [code, isNotNull(otherPath) ? normalizeRoutePath(code + otherPath) : null]
              }),
            ) as Record<LanguageCode, string | null>,
          })
        }
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
            (!indexableOnly || (record.isIndexable && !record.hasCanonicalOverride)),
        )

        for (const record of records) {
          languageEntries.push({
            path: normalizeRoutePath(`${languagePrefix}/${basePath}/${record.subpath}`),
            language: language as LanguageCode,
            updatedAt: record.updatedAt ?? route.updatedAt,
            translations: Object.fromEntries(
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
                      (!indexableOnly || (translation.isIndexable && !translation.hasCanonicalOverride)),
                  )
                  return [code, sibling ? normalizeRoutePath(`${code}/${otherPath}/${sibling.subpath}`) : null]
                }

                return [code, normalizeRoutePath(`${code}/${otherPath}/${record.subpath}`)]
              }),
            ) as Record<LanguageCode, string | null>,
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
