import { __, assertQuery, getCollectionFromEvent, guardedInsertInto, pruviousError } from '#pruvious/server'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  const collection = await getCollectionFromEvent()

  if (!collection.definition.meta.api.create) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? 'To enable API access for this collection, set `api.create: true` in your collection definition'
        : __('pruvious-api', 'Collection not found'),
    })
  }

  const query = await guardedInsertInto(collection.name as any)
    .fromQueryString(event.path)
    .values(event.context.pruvious.input)
    .run()

  assertQuery(query)

  return query.data
})
