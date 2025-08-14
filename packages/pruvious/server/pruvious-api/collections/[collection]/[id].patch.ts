import { __, assertQuery, getCollectionFromEvent, guardedUpdate, pruviousError } from '#pruvious/server'
import { isEmpty, isPositiveInteger } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  const collection = await getCollectionFromEvent()
  const idParam = Number(getRouterParam(event, 'id')?.match(/^[1-9]\d*$/)?.[0] ?? '')

  if (!collection.definition.meta.api.update) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? 'To enable API access for this collection, set `api.update: true` in your collection definition'
        : __('pruvious-api', 'Collection not found'),
    })
  }

  if (!isPositiveInteger(idParam)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment ? 'The `:id` route parameter must be a positive integer' : undefined,
    })
  }

  const query = await guardedUpdate(collection.name as any)
    .fromQueryString(event.path, { where: false })
    .where('id', '=', idParam)
    .set(event.context.pruvious.input as any)
    .run()

  assertQuery(query)

  if (isEmpty(query.data)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  return query.data
})
