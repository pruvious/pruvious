import {
  primaryLanguage,
  supportedLanguages,
  type Image,
  type PopulatedFieldType,
  type PublicPagesOptions,
  type ResolvedCollectionDefinition,
  type SupportedLanguage,
} from '#pruvious'
import { H3Event, getQuery } from 'h3'
import type { PruviousPage } from '../composables/page'
import { getModuleOption } from '../instances/state'
import { __ } from '../utils/server/translate-string'
import { joinRouteParts, resolveCollectionPathPrefix } from '../utils/string'
import { query } from './query'

/**
 * Create SEO for a page-like collection record.
 */
export async function seo(
  collection: ResolvedCollectionDefinition,
  page: Record<string, any>,
  event: H3Event,
): Promise<{
  props: Pick<PruviousPage, 'title' | 'description' | 'htmlAttrs' | 'meta' | 'link' | 'script'>
  settings: PopulatedFieldType['seo']
}> {
  const qs = getQuery(event)
  const seo = await query('seo')
    .language(page.language as SupportedLanguage)
    .populate()
    .read()

  const pp = collection.publicPages as PublicPagesOptions
  const pagePath = page[pp.pathField ?? 'path']
  const pagePublic = pp.publicField ? page[pp.publicField] : true
  const pageDraftToken = pp.draftTokenField ? page[pp.draftTokenField] : ''
  const pageTitle = pp.seo?.titleField ? page[pp.seo.titleField] : ''
  const pageBaseTitle = pp.seo?.baseTitleField ? page[pp.seo.baseTitleField] : ''
  const pageDescription = pp.seo?.descriptionField ? page[pp.seo.descriptionField] : ''
  const pageVisible = pp.seo?.visibleField ? page[pp.seo.visibleField] : true
  const pageSharingImage = pp.seo?.sharingImageField ? page[pp.seo.sharingImageField] : null
  const pageMetaTags = pp.seo?.metaTagsField ? page[pp.seo.metaTagsField] : []
  const prefixPrimaryLanguage = getModuleOption('language').prefixPrimary
  const pathPrefix = Object.fromEntries(
    supportedLanguages.map((code) => [
      code,
      resolveCollectionPathPrefix(collection, code as SupportedLanguage, primaryLanguage),
    ]),
  ) as Record<string, string>

  const htmlAttrs: PruviousPage['htmlAttrs'] = {}
  const meta: PruviousPage['meta'] = []
  const link: PruviousPage['link'] = []
  const script: PruviousPage['script'] = []

  let title = pageTitle || pagePath?.slice(1) || ''

  // Title
  if (qs.__p) {
    title = pageTitle
      ? `(${__(event, 'pruvious-server', 'PREVIEW')}) ${pageTitle}`
      : __(event, 'pruvious-server', 'PREVIEW')
  } else if (!pagePublic && pageDraftToken) {
    title = pageTitle ? `(${__(event, 'pruvious-server', 'DRAFT')}) ${title}` : __(event, 'pruvious-server', 'DRAFT')
  }

  if (pageBaseTitle && seo.baseTitle) {
    title =
      seo.baseTitlePosition === 'before'
        ? seo.baseTitle + seo.titleSeparator + title
        : title + seo.titleSeparator + seo.baseTitle
  }

  // Robots
  if (!seo.visible || !pagePublic || !pageVisible) {
    meta.push({ name: 'robots', content: 'noindex, nofollow' })
  }

  // Language
  htmlAttrs.lang = page.language

  if (page.translations && pagePath) {
    const translations: Record<string, string> = {}

    for (const [language, id] of Object.entries<number>(page.translations ?? {}).filter(([_, id]) => id)) {
      const q = (query as any)(collection.name).where('id', id)

      if (pp.publicField) {
        q.where(pp.publicField, true)
      }

      const path = (await q.first())?.[pp.pathField ?? 'path']

      if (path) {
        translations[language] =
          seo.baseUrl +
          joinRouteParts(
            language === primaryLanguage && !prefixPrimaryLanguage ? '' : language,
            pathPrefix[language],
            path,
          )
      }
    }

    for (const language of supportedLanguages) {
      if (language === page.language) {
        link.push({
          rel: 'alternate',
          hreflang: language,
          href:
            seo.baseUrl +
            joinRouteParts(
              language === primaryLanguage && !prefixPrimaryLanguage ? '' : language,
              pathPrefix[language],
              pagePath,
            ),
        })
      } else if (translations[language]) {
        link.push({ rel: 'alternate', hreflang: language, href: translations[language] })
      }
    }

    link.push({
      rel: 'alternate',
      hreflang: 'x-default',
      href:
        page.language === primaryLanguage
          ? seo.baseUrl +
            joinRouteParts(prefixPrimaryLanguage ? primaryLanguage : '', pathPrefix[page.language], pagePath)
          : translations[primaryLanguage] ??
            seo.baseUrl + joinRouteParts(page.language, pathPrefix[page.language], pagePath),
    })
  }

  // Favicon
  if (seo.favicon) {
    link.push({
      rel: 'icon',
      type: 'image/svg+xml',
      href: seo.favicon.src.startsWith('http') ? seo.favicon.src : seo.baseUrl + seo.favicon.src,
    })

    if (seo.favicon.sources[0]) {
      link.push({
        rel: 'icon',
        type: 'image/png',
        href: seo.favicon.sources[0].srcset.startsWith('http')
          ? seo.favicon.sources[0].srcset
          : seo.baseUrl + seo.favicon.sources[0].srcset,
      })
    }
  }

  // Sharing image
  let sharingImage: Image | null = pageSharingImage || seo.sharingImage

  if (sharingImage?.sources[0]) {
    const content = sharingImage.sources[0].srcset.startsWith('http')
      ? sharingImage.sources[0].srcset
      : seo.baseUrl + sharingImage.sources[0].srcset

    meta.push({ property: 'og:image', content })
    meta.push({ property: 'twitter:image', content })
  }

  // Organization logo
  if (seo.logo) {
    script.push({
      tagPosition: 'head',
      type: 'application/ld+json',
      innerHTML: `{"@context":"https://schema.org","@type":"Organization","url":"${seo.baseUrl}/","logo":"${
        seo.logo.src.startsWith('http') ? seo.logo.src : seo.baseUrl + seo.logo.src
      }"}`,
    })
  }

  // Other social media tags
  if (seo.socialMediaMeta) {
    if (seo.baseTitle) {
      meta.push({ property: 'og:site_name', content: seo.baseTitle })
    }

    meta.push({ property: 'og:locale', content: page.language })
    meta.push({ property: 'og:title', content: title })

    if (pageDescription) {
      meta.push({ property: 'og:description', content: pageDescription })
    }

    meta.push({ property: 'og:url', content: seo.baseUrl + pagePath })
    meta.push({ property: 'twitter:title', content: title })

    if (pageDescription) {
      meta.push({ property: 'twitter:description', content: pageDescription })
    }

    meta.push({ property: 'og:type', content: 'website' })
    meta.push({ property: 'twitter:card', content: 'summary_large_image' })
  }

  // Other meta tags
  if (pageDescription) {
    meta.push({ name: 'description', content: pageDescription })
  }

  for (const { name, content } of seo.metaTags) {
    meta.push(name.startsWith('og:') || name.startsWith('twitter:') ? { property: name, content } : { name, content })
  }

  for (const { name, content } of pageMetaTags) {
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      if (!meta.some((tag) => tag.property === name)) {
        meta.push({ property: name, content })
      }
    } else {
      if (!meta.some((tag) => tag.name === name)) {
        meta.push({ name, content })
      }
    }
  }

  // Scripts
  for (const { js, kind, position, url } of seo.scripts) {
    const item: PruviousPage['script'][0] = { tagPosition: position ?? undefined } as any

    if (kind === 'external') {
      item.src = url
    } else {
      item.innerHTML = js
    }

    script.push(item)
  }

  return {
    props: { title, description: pageDescription ?? '', htmlAttrs, meta, link, script },
    settings: seo,
  }
}
