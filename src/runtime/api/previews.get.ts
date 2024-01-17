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
        const population = collection.fields.blocks.additional?.population ?? fields.repeater.population

        if (collection.fields.blocks && population) {
          populated.translations = await collection.fields.translations.additional?.population?.populator({
            currentQuery: query(collection.name as any),
            definition: fields.text,
            name: 'translations',
            fields,
            value: data.translations,
            options: {},
            query,
          })

          populated.blocks = await population.populator({
            value: data.blocks,
            definition: fields.repeater,
            name: 'blocks',
            options: resolveCollectionFieldOptions(
              collection.name,
              'repeater',
              'blocks',
              collection.fields.blocks.options,
              fields,
            ),
            currentQuery: query(collection.name as any),
            query: query,
            fields,
          })
        }

        const seoProps = await seo(collection, populated, event)
        const pp = collection.publicPages as PublicPagesOptions

        return {
          id: populated.id,
          path,
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
