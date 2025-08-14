import { __, assertQuery, getCollectionFromEvent, guardedSelectFrom, pruviousError } from '#pruvious/server'
import { isEmpty, isPositiveInteger } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  const collection = await getCollectionFromEvent()
  const idParam = Number(getRouterParam(event, 'id')?.match(/^[1-9]\d*$/)?.[0] ?? '')

  if (!collection.definition.meta.api.read) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? 'To enable API access for this collection, set `api.read: true` in your collection definition'
        : __('pruvious-api', 'Collection not found'),
    })
  }

  if (!isPositiveInteger(idParam)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment ? 'The `:id` route parameter must be a positive integer' : undefined,
    })
  }

  const query = await guardedSelectFrom(collection.name as any)
    .fromQueryString(event.path, { where: false, groupBy: false, orderBy: false, limit: false, offset: false })
    .where('id', '=', idParam)
    .first()

  assertQuery(query)

  if (isEmpty(query.data)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  return query.data
})
