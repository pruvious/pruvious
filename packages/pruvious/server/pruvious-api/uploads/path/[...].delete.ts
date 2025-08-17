import { __, assertUserPermissions, deleteUpload, pruviousError } from '#pruvious/server'
import { queryStringToDeleteQueryBuilderParams } from '@pruvious/orm'
import { isEmpty, isUndefined } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:delete'])

  const pathParam = getRouterParam(event, '_')

  if (isUndefined(pathParam)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment ? 'The `:path` route parameter must be a string' : undefined,
    })
  }

  const { returning, populate } = queryStringToDeleteQueryBuilderParams(event.path) as any
  const deleteResults = await deleteUpload(pathParam, { returning, populate })

  if (isEmpty(deleteResults)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  return deleteResults
})
