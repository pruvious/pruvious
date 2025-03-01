import { __, assertQuery, assertUser, getLogsDatabase, pruviousError } from '#pruvious/server'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUser(event)

  const runtimeConfig = useRuntimeConfig()

  if (!runtimeConfig.pruvious.debug.logs.custom || !event.context.pruvious.auth.permissions.includes('read-logs')) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? !runtimeConfig.pruvious.debug.logs.custom
          ? 'To access custom logs, you must first enable them in the `pruvious.debug.logs.custom` setting in your `nuxt.config.ts` file'
          : 'You need the `read-logs` permission to access custom logs'
        : __('pruvious-api', 'Resource not found'),
    })
  }

  const query = await getLogsDatabase()
    .queryBuilder({ contextLanguage: event.context.pruvious.language })
    .selectFrom('Custom')
    .fromQueryString(event.path)
    .paginate()

  assertQuery(query)

  return query.data
})
