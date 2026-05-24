import { __, assertUserPermissions, clearPageCache, clearPageCachePaths, pruviousError } from '#pruvious/server'
import { isArray, isNull, isObject, isString, isUndefined } from '@pruvious/utils'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['clear-page-cache'])

  const paths = parsePathsInput(event.context.pruvious.input)

  if (paths === false) {
    throw pruviousError(event, {
      statusCode: 422,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'paths' }),
    })
  }

  const cleared = paths.length ? await clearPageCachePaths(paths) : await clearPageCache()

  return { cleared }
})

function parsePathsInput(input: unknown): string[] | false {
  if (isUndefined(input) || isNull(input)) {
    return []
  }
  if (!isObject(input)) {
    return false
  }
  const raw = (input as { paths?: unknown }).paths
  if (isUndefined(raw) || isNull(raw)) {
    return []
  }
  if (!isArray(raw) || !raw.every((value) => isString(value) && value.length > 0)) {
    return false
  }
  return raw as string[]
}
