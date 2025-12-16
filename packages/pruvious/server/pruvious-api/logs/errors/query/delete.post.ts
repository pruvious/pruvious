import { __, assertQuery, assertUser, getLogsDatabase, parseBody, pruviousError } from '#pruvious/server'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUser(event)

  const runtimeConfig = useRuntimeConfig()

  if (!runtimeConfig.pruvious.debug.logs.errors || !event.context.pruvious.auth.permissions.includes('delete-logs')) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? !runtimeConfig.pruvious.debug.logs.errors
          ? 'To access error logs, you must first enable them in the `pruvious.debug.logs.errors` setting in your `nuxt.config.ts` file'
          : 'You need the `delete-logs` permission to delete error logs'
        : __('pruvious-api', 'Resource not found'),
    })
  }

  const input = await parseBody(event, 'object').then(({ input }) => input)
  const query = await getLogsDatabase()
    .queryBuilder({ contextLanguage: event.context.pruvious.language })
    .deleteFrom('Errors')
    .fromQueryString(input.query ?? {})
    .run()

  assertQuery(query)

  return query.data
})
