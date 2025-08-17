import { __, assertUserPermissions, deleteUpload, pruviousError } from '#pruvious/server'
import { queryStringToDeleteQueryBuilderParams } from '@pruvious/orm'
import { castToBoolean, isEmpty, isPositiveInteger } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:delete'])

  const idParam = Number(getRouterParam(event, 'id')?.match(/^[1-9]\d*$/)?.[0] ?? '')

  if (!isPositiveInteger(idParam)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment ? 'The `:id` route parameter must be a positive integer' : undefined,
    })
  }

  const { returning, populate } = queryStringToDeleteQueryBuilderParams(event.path) as any
  const recursive = castToBoolean(getQuery(event).recursive) === true
  const deleteResults = await deleteUpload(idParam, { returning, populate, recursive })

  if (isEmpty(deleteResults)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  return deleteResults
})
