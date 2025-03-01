import { __, assertUserPermissions, moveUpload, parseBody, pruviousError } from '#pruvious/server'
import { queryStringToUpdateQueryBuilderParams } from '@pruvious/orm'
import { castToBoolean, isEmpty, isPositiveInteger } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:update'])

  const idParam = Number(getRouterParam(event, 'id')?.match(/^[1-9]\d*$/)?.[0] ?? '')

  if (!isPositiveInteger(idParam)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment ? 'The `:id` route parameter must be a positive integer' : undefined,
    })
  }

  const { returning, populate } = queryStringToUpdateQueryBuilderParams(event.path) as any
  const overwrite = castToBoolean(getQuery(event).overwrite) === true
  const { input } = await parseBody(event, 'object')
  const updateResults = await moveUpload(idParam, input.path, { returning, populate, overwrite })

  if (isEmpty(updateResults)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  return updateResults
})
