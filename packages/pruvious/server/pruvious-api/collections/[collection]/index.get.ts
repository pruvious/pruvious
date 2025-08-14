import { __, assertQuery, getCollectionFromEvent, guardedSelectFrom, pruviousError } from '#pruvious/server'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  const collection = await getCollectionFromEvent()

  if (!collection.definition.meta.api.read) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? 'To enable API access for this collection, set `api.read: true` in your collection definition'
        : __('pruvious-api', 'Collection not found'),
    })
  }

  const query = await guardedSelectFrom(collection.name as any)
    .fromQueryString(event.path)
    .paginate()

  assertQuery(query)

  return query.data
})
