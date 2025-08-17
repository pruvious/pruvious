import { __, assertUserPermissions, parseBody, pruviousError, updateUpload } from '#pruvious/server'
import { queryStringToUpdateQueryBuilderParams } from '@pruvious/orm'
import { castToBoolean, isEmpty, isUndefined, omit } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:update'])

  const pathParam = getRouterParam(event, '_')

  if (isUndefined(pathParam)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment ? 'The `:path` route parameter must be a string' : undefined,
    })
  }

  const { returning, populate } = queryStringToUpdateQueryBuilderParams(event.path) as any
  const recursive = castToBoolean(getQuery(event).recursive) === true
  const { input } = await parseBody(event, 'object')
  const updateResults = await updateUpload(pathParam, omit(input, ['isLocked']), { returning, populate, recursive })

  if (isEmpty(updateResults)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  return updateResults
})
