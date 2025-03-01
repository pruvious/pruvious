import { __, assertQuery, assertUser, getLogsDatabase, parseBody, pruviousError } from '#pruvious/server'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUser(event)

  const runtimeConfig = useRuntimeConfig()

  if (
    !runtimeConfig.pruvious.debug.logs.queries.enabled ||
    !event.context.pruvious.auth.permissions.includes('read-logs')
  ) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? !runtimeConfig.pruvious.debug.logs.queries.enabled
          ? 'To access query logs, you must first enable them in the `pruvious.debug.logs.queries` setting in your `nuxt.config.ts` file'
          : 'You need the `read-logs` permission to access query logs'
        : __('pruvious-api', 'Resource not found'),
    })
  }

  const input = await parseBody(event, 'object').then(({ input }) => input)
  const query = await getLogsDatabase()
    .queryBuilder({ contextLanguage: event.context.pruvious.language })
    .selectFrom('Queries')
    .fromQueryString(input.query ?? {})
    .paginate()

  assertQuery(query)

  return query.data
})
