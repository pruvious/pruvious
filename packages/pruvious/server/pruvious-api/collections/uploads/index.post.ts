import {
  __,
  assertQuery,
  assertUserPermissions,
  guardedInsertInto,
  parseBody,
  prepareUploadsInput,
  pruviousError,
  putUpload,
} from '#pruvious/server'
import { queryStringToInsertQueryBuilderParams } from '@pruvious/orm'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:create'])

  const { input, files } = await parseBody(event)
  const preparedInput = prepareUploadsInput(input, files)
  const { returning, populate } = queryStringToInsertQueryBuilderParams(event.path) as any

  // Directories
  if (preparedInput.type === 'directories') {
    const query = await guardedInsertInto('Uploads')
      .fromQueryString(event.path)
      .values(preparedInput.items)
      .withCustomContextData({ _allowUploadsQueries: true })
      .run()

    assertQuery(query)
    return query
  }

  // Files
  if (!preparedInput.items.length) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'No files uploaded'),
    })
  }

  return Promise.all(
    preparedInput.items.map(({ file, path, author, editors }) =>
      putUpload(file, { path, author, editors }, { returning, populate }),
    ),
  )
})
