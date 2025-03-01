import { __, assertQuery, getSingletonFromEvent, guardedUpdateSingleton, pruviousError } from '#pruvious/server'
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
    .validate()

  assertQuery(query)

  return true
})
