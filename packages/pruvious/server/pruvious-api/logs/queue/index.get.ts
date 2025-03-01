import { __, assertQuery, assertUser, getLogsDatabase, pruviousError } from '#pruvious/server'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUser(event)

  const runtimeConfig = useRuntimeConfig()

  if (!runtimeConfig.pruvious.debug.logs.queue || !event.context.pruvious.auth.permissions.includes('read-logs')) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? !runtimeConfig.pruvious.debug.logs.queue
          ? 'To access queue logs, you must first enable them in the `pruvious.debug.logs.queue` setting in your `nuxt.config.ts` file'
          : 'You need the `read-logs` permission to access queue logs'
        : __('pruvious-api', 'Resource not found'),
    })
  }

  const query = await getLogsDatabase()
    .queryBuilder({ contextLanguage: event.context.pruvious.language })
    .selectFrom('Queue')
    .fromQueryString(event.path)
    .paginate()

  assertQuery(query)

  return query.data
})
