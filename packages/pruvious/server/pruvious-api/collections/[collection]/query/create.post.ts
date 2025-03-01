import { __, assertQuery, getCollectionFromEvent, guardedInsertInto, parseBody, pruviousError } from '#pruvious/server'
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

  const input = await parseBody(event, 'object').then(({ input }) => input)
  const query = await guardedInsertInto(collection.name)
    .fromQueryString(input.query ?? {})
    .values(input.data ?? [])
    .run()

  assertQuery(query)

  return query.data
})
