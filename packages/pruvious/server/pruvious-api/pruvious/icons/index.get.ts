import { __, assertUserPermissions, pruviousError, pruviousIconNames } from '#pruvious/server'
import { isString } from '@pruvious/utils'
import { resolveIconDir } from '../../../../modules/pruvious/icons/utils.server'

interface IconsListResult {
  dir: string
  names: string[]
}

/**
 * Lists `.svg` basenames in the requested icon directory for the dashboard picker.
 */
export default defineEventHandler(async (event): Promise<IconsListResult> => {
  assertUserPermissions(event, ['access-dashboard'])

  const query = getQuery(event)
  const resolved = resolveIconDir(isString(query.dir) ? query.dir : undefined)

  if (resolved.kind === 'malformed') {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Invalid icon directory'),
    })
  }

  if (resolved.kind === 'unknown') {
    return { dir: resolved.prefix, names: [] }
  }

  return { dir: resolved.prefix, names: pruviousIconNames[resolved.prefix] ?? [] }
})
