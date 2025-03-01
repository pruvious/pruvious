import { assertQuery, assertUserPermissions, completeMultipartUpload, pruviousError } from '#pruvious/server'
import { queryStringToInsertQueryBuilderParams } from '@pruvious/orm'
import { isString } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:create'])

  const key = getRouterParam(event, 'key')
  const { returning, populate } = queryStringToInsertQueryBuilderParams(event.path) as any

  if (!isString(key)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment ? 'The `:key` route parameter must be a string' : undefined,
    })
  }

  const result = await completeMultipartUpload(key, { returning, populate })

  assertQuery(result)

  return result
})
