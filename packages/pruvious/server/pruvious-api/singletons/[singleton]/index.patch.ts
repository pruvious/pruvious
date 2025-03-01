import { __, assertQuery, getSingletonFromEvent, guardedUpdateSingleton, pruviousError } from '#pruvious/server'
import { isEmpty } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  const singleton = await getSingletonFromEvent()

  if (!singleton.definition.api.update) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? 'To enable API access for this singleton, set `api.update: true` in your singleton definition'
        : __('pruvious-api', 'Singleton not found'),
    })
  }

  const query = await guardedUpdateSingleton(singleton.name)
    .fromQueryString(event.path)
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
