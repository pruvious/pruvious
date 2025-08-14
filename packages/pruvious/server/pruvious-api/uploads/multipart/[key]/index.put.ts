import { __, assertUserPermissions, parseBody, pruviousError, resumeMultipartUpload } from '#pruvious/server'
import { isEmpty, isPositiveInteger, isString } from '@pruvious/utils'
import { isDevelopment } from 'std-env'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:create'])

  const key = getRouterParam(event, 'key')
  const partNumber = Number(
    getQuery(event)
      .partNumber?.toString()
      .match(/^[1-9]\d*$/)?.[0] ?? '',
  )
  const { files } = await parseBody(event)
  const filesArray = Object.values(files)

  if (!isString(key)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment ? 'The `:key` route parameter must be a string' : undefined,
    })
  }

  if (!isPositiveInteger(partNumber)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: isDevelopment ? 'The `:partNumber` route parameter must be a positive integer' : undefined,
    })
  }

  if (!isEmpty(filesArray)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'No file parts uploaded'),
    })
  }

  if (filesArray.length > 1) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Only one file part can be uploaded at a time'),
    })
  }

  const result = await resumeMultipartUpload(filesArray[0]!, partNumber, key)

  if (!result.success) {
    throw pruviousError(event, {
      statusCode: 400,
      message: result.error,
    })
  }

  return result
})
