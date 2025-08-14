import { __, assertQuery, getCollectionFromEvent, guardedUpdate, pruviousError } from '#pruvious/server'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  const collection = await getCollectionFromEvent()

  if (!collection.definition.meta.api.update) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? 'To enable API access for this collection, set `api.update: true` in your collection definition'
        : __('pruvious-api', 'Collection not found'),
    })
  }

  const query = await guardedUpdate(collection.name as any)
    .fromQueryString(event.path)
    .set(event.context.pruvious.input as any)
    .run()

  assertQuery(query)

  return query.data
})
