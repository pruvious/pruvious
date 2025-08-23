import {
  __,
  assertUserPermissions,
  collections,
  guardedInsertInto,
  parseBody,
  prepareUploadsInput,
  pruviousError,
  putUpload,
} from '#pruvious/server'
import { queryStringToInsertQueryBuilderParams } from '@pruvious/orm'
import { castToBoolean, isUndefined, omit, toArray } from '@pruvious/utils'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['collection:uploads:create'])

  const { input, files } = await parseBody(event)
  const preparedInput = prepareUploadsInput(input, files)
  const { returning, populate } = queryStringToInsertQueryBuilderParams(event.path) as any
  const overwrite = castToBoolean(getQuery(event).overwrite) === true

  // Directories
  if (preparedInput.type === 'directories') {
    const fields: string[] =
      isUndefined(returning) || toArray(returning).includes('*' as any)
        ? ([...Object.keys(collections.Uploads.fields), 'id'] as any)
        : returning
    const query = await guardedInsertInto('Uploads')
      .fromQueryString(event.path)
      .values(preparedInput.items)
      .returning([...fields, 'id', 'path'] as any)
      .withCustomContextData({ _allowUploadsQueries: true })
      .run()

    if (query.success) {
      return preparedInput.items.map((_, i) => ({
        success: true,
        data: omit(query.data[i], [
          ...(fields.includes('id') ? [] : ['id']),
          ...(fields.includes('path') ? [] : ['path']),
        ]),
        details: { id: query.data[i].id, path: query.data[i].path, type: 'directory' },
      }))
    } else {
      return preparedInput.items.map((item, i) => ({
        success: false,
        inputErrors: query.inputErrors?.[i],
        runtimeError: query.runtimeError,
        details: { path: item.path, type: 'directory' },
      }))
    }
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
      putUpload(file, { path, author, editors }, { returning, populate, overwrite }),
    ),
  )
})
