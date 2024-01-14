import { primaryLanguage, supportedLanguages, type CollectionName, type SupportedLanguage } from '#pruvious'
import { collections } from '#pruvious/collections'
import { defineEventHandler, getQuery, getRouterParam, setResponseStatus } from 'h3'
import { isProduction } from 'std-env'
import { stringifyQuery } from 'ufo'
import { query } from '../collections/query'
import { seo } from '../collections/seo'
import type { PruviousPage } from '../composables/page'
import { getModuleOption } from '../instances/state'
import { objectPick } from '../utils/object'
import { resolveRedirect } from '../utils/server/resolve-redirects'
import { __ } from '../utils/server/translate-string'
import { getTranslationPrefix, joinRouteParts, resolveCollectionPathPrefix } from '../utils/string'

export default defineEventHandler(async (event) => {
  const fullPath = '/' + (getRouterParam(event, '_') ?? '')
  const translationPrefix = getTranslationPrefix(fullPath, supportedLanguages)
  const language = translationPrefix ?? primaryLanguage
  const collectionPath = translationPrefix ? fullPath.replace(`/${translationPrefix}`, '') : fullPath
  const pathPrefixCandidate = collectionPath.slice(1).split('/')[0]
  const ppc = Object.fromEntries(
    Object.values(collections)
      .filter((c) => c.publicPages)
      .map((c) => [resolveCollectionPathPrefix(c, language, primaryLanguage), c]),
  )
  const collection = ppc[pathPrefixCandidate] ?? ppc['']
  const pathPrefix = ppc[pathPrefixCandidate] ? pathPrefixCandidate : ''

  if (collection && collection.publicPages) {
    const pagePath = (pathPrefix ? collectionPath.replace(`/${pathPrefix}`, '') : collectionPath) || '/'
    const prefixPrimaryLanguage = getModuleOption('language').prefixPrimary

    if (prefixPrimaryLanguage && !translationPrefix && language === primaryLanguage) {
      setResponseStatus(event, isProduction ? 301 : 302)
      return joinRouteParts(
        `${language}/`,
        resolveCollectionPathPrefix(collection, language, primaryLanguage),
        `/${pagePath}`,
      )
    } else if (!prefixPrimaryLanguage && translationPrefix && language === primaryLanguage) {
      setResponseStatus(event, isProduction ? 301 : 302)
      return joinRouteParts(resolveCollectionPathPrefix(collection, language, primaryLanguage), `/${pagePath}`)
    }

    const redirect = await resolveRedirect(fullPath)

    if (redirect) {
      setResponseStatus(event, isProduction ? redirect.code : 302)

      if (redirect.forwardQueryParams) {
        const qs = stringifyQuery(getQuery(event))

        if (qs) {
          return redirect.to + (redirect.to.includes('?') ? '&' : '?') + qs
        }
      }

      return redirect.to
    }

    const page = await (query as any)(collection.name)
      .where(collection.publicPages.pathField ?? 'path', pagePath)
      .where('language', language)
      .populate()
      .first()

    if (page && (page.public || page.draftToken === getQuery(event).__d)) {
      const seoProps = await seo(collection, page, event)

      return {
        id: page.id,
        path: fullPath,
        collection: collection.name as CollectionName,
        blocks: collection.contentBuilder ? page[collection.contentBuilder.blocksField] : [],
        language: page.language!,
        translations: Object.fromEntries(
          supportedLanguages.map((code) => [
            code,
            seoProps.link.find((link) => link.rel === 'alternate' && link.hreflang === code)?.href ?? null,
          ]),
        ) as Record<SupportedLanguage, string | null>,
        layout: collection.publicPages.layoutField ? page[collection.publicPages.layoutField] : null,
        publishDate: collection.publicPages.publishDateField ? page[collection.publicPages.publishDateField] : null,
        createdAt: collection.createdAtField ? page[collection.createdAtField] : null,
        updatedAt: collection.updatedAtField ? page[collection.updatedAtField] : null,
        ...seoProps,
        fields: objectPick(
          page,
          collection.publicPages && collection.publicPages.additionalFields
            ? collection.publicPages.additionalFields
            : [],
        ),
      } satisfies PruviousPage
    }
  }

  setResponseStatus(event, 404)
  return __(event, 'pruvious-server', 'Resource not found')
})
