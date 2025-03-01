import { __, assertQuery, getSingletonFromEvent, guardedSelectSingleton, pruviousError } from '#pruvious/server'
import { isEmpty } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  const singleton = await getSingletonFromEvent()

  if (!singleton.definition.api.read) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? 'To enable API access for this singleton, set `api.read: true` in your singleton definition'
        : __('pruvious-api', 'Singleton not found'),
    })
  }

  const query = await guardedSelectSingleton(singleton.name).fromQueryString(event.path).get()

  assertQuery(query)

  if (isEmpty(query.data)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  return query.data
})
