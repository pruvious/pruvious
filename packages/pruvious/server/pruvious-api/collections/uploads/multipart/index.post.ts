import { assertUserPermissions, createMultipartUpload, parseBody, pruviousError } from '#pruvious/server'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:create'])

  const { input } = await parseBody(event, 'object')
  const result = await createMultipartUpload(input as any)

  if (!result.success) {
    throw pruviousError(event, {
      statusCode: 400,
      message: result.error,
    })
  }

  return result
})
