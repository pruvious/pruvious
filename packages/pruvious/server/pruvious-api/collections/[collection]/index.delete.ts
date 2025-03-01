import { __, assertQuery, getCollectionFromEvent, guardedDeleteFrom, pruviousError } from '#pruvious/server'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  const collection = await getCollectionFromEvent()

  if (!collection.definition.meta.api.delete) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? 'To enable API access for this collection, set `api.delete: true` in your collection definition'
        : __('pruvious-api', 'Collection not found'),
    })
  }

  const query = await guardedDeleteFrom(collection.name).fromQueryString(event.path).run()

  assertQuery(query)

  return query.data
})
