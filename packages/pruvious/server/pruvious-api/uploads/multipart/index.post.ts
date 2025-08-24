import { assertUserPermissions, createMultipartUpload, parseBody, pruviousError } from '#pruvious/server'
import { castToBoolean } from '@pruvious/utils'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:create'])

  const { input } = await parseBody(event, 'object')
  const overwrite = castToBoolean(getQuery(event).overwrite) === true
  const result = await createMultipartUpload(input as any, { overwrite })

  if (!result.success) {
    throw pruviousError(event, {
      statusCode: 400,
      message: result.error,
      data: result.inputErrors,
    })
  }

  return result
})
