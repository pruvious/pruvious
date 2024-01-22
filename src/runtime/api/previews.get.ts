import { supportedLanguages, type CollectionName, type PublicPagesOptions, type SupportedLanguage } from '#pruvious'
import { collections } from '#pruvious/collections'
import { fields, resolveCollectionFieldOptions } from '#pruvious/server'
import { defineEventHandler, getQuery, getRouterParam, setResponseStatus } from 'h3'
import { query } from '../collections/query'
import { seo } from '../collections/seo'
import type { PruviousPage } from '../composables/page'
import { objectPick } from '../utils/object'
import { __ } from '../utils/server/translate-string'

export default defineEventHandler(async (event) => {
  const path = '/' + (getRouterParam(event, '_') ?? '')
  const qs = getQuery(event)

  if (qs.__p) {
    const preview = await query('previews').where('token', qs.__p.toString()).first()

    if (preview) {
      const collection = collections[preview.collection as keyof typeof collections]

      if (collection.mode === 'multi') {
        const data = JSON.parse(preview.data)
        const populated = { ...data }

        for (const [fieldName, field] of Object.entries(collection.fields)) {
          const definition = fields[field.type]
          const population = field.additional?.population ?? definition?.population

          if (population) {
            populated[fieldName] = await population.populator({
              currentQuery: query(collection.name as any),
              definition,
              name: fieldName,
              fields,
              value: data[fieldName],
              options: resolveCollectionFieldOptions(
                collection.name,
                field.type,
                fieldName,
                collection.fields[fieldName].options,
                fields,
              ),
              query,
            })
          }
        }

        const { props: seoProps, settings: seoSettings } = await seo(collection, populated, event)
        const pp = collection.publicPages as PublicPagesOptions

        return {
          id: populated.id,
          path,
          url: seoSettings.baseUrl + path,
          collection: collection.name as CollectionName,
          blocks: collection.contentBuilder ? populated[collection.contentBuilder.blocksField] : [],
          language: populated.language,
          translations: Object.fromEntries(
            supportedLanguages.map((code) => [
              code,
              seoProps.link.find((link) => link.rel === 'alternate' && link.hreflang === code)?.href ?? null,
            ]),
          ) as Record<SupportedLanguage, string | null>,
          layout: pp.layoutField ? populated[pp.layoutField] : null,
          publishDate: pp.publishDateField ? populated[pp.publishDateField] : null,
          createdAt: collection.createdAtField ? populated[collection.createdAtField] : null,
          updatedAt: collection.updatedAtField ? populated[collection.updatedAtField] : null,
          ...seoProps,
          fields: objectPick(populated, pp.additionalFields ? pp.additionalFields : []),
        } satisfies PruviousPage
      }
    }
  }

  setResponseStatus(event, 404)
  return __(event, 'pruvious-server', 'Resource not found')
})
