import { __, assertQuery, assertUser, getLogsDatabase, pruviousError } from '#pruvious/server'
import { isEmpty, isPositiveInteger } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUser(event)

  const runtimeConfig = useRuntimeConfig()
  const idParam = Number(getRouterParam(event, 'id')?.match(/^[1-9]\d*$/)?.[0] ?? '')

  if (
    !runtimeConfig.pruvious.debug.logs.api.enabled ||
    !event.context.pruvious.auth.permissions.includes('read-logs')
  ) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment
        ? !runtimeConfig.pruvious.debug.logs.api.enabled
          ? 'To access API logs, you must first enable them in the `pruvious.debug.logs.api` setting in your `nuxt.config.ts` file'
          : 'You need the `read-logs` permission to access API logs'
        : __('pruvious-api', 'Resource not found'),
    })
  }

  if (!isPositiveInteger(idParam)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment ? 'The `:id` route parameter must be a positive integer' : undefined,
    })
  }

  const query = await getLogsDatabase()
    .queryBuilder({ contextLanguage: event.context.pruvious.language })
    .selectFrom('Responses')
    .fromQueryString(event.path, { where: false, groupBy: false, orderBy: false, limit: false, offset: false })
    .where('id', '=', idParam)
    .paginate()

  assertQuery(query)

  if (isEmpty(query.data)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  return query.data
})
