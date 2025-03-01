import { __, assertQuery, getCollectionFromEvent, guardedDeleteFrom, parseBody, pruviousError } from '#pruvious/server'
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

  const input = await parseBody(event, 'object').then(({ input }) => input)
  const query = await guardedDeleteFrom(collection.name)
    .fromQueryString(input.query ?? {})
    .run()

  assertQuery(query)

  return query.data
})
