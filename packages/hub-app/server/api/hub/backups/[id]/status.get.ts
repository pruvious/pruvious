import { __, getUser, pruviousError, selectFrom } from '#pruvious/server'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import { defineEventHandler, getRouterParam } from 'h3'
import { canAccessTarget } from '../../../../utils/deployAccess'

export default defineEventHandler(async (event) => {
  const user = getUser()

  if (!user) {
    throw pruviousError(event, { statusCode: 401 })
  }

  const backupId = castToNumber(getRouterParam(event, 'id'))

  if (!isPositiveInteger(backupId)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'id' }),
    })
  }

  const query = await selectFrom('Backups')
    .select(['id', 'status', 'target', 'finishedAt', 'sizeBytes'])
    .where('id', '=', backupId)
    .first()

  if (!query.success || !query.data || !(await canAccessTarget(user, query.data.target as number))) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Backup not found'),
    })
  }

  return {
    status: query.data.status,
    finishedAt: query.data.finishedAt,
    sizeBytes: query.data.sizeBytes,
  }
})
