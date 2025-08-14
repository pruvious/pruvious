import { assertUserPermissions, getMultipartUpload, pruviousError } from '#pruvious/server'
import { isString } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:create'])

  const key = getRouterParam(event, 'key')

  if (!isString(key)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment ? 'The `:key` route parameter must be a string' : undefined,
    })
  }

  const result = await getMultipartUpload(key)

  if (!result.success) {
    throw pruviousError(event, {
      statusCode: 400,
      message: result.error,
    })
  }

  return result
})
