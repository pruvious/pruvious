import { __, getUser, pruviousError, selectFrom } from '#pruvious/server'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import { defineEventHandler, getRouterParam } from 'h3'
import { canAccessTarget } from '../../../../utils/deployAccess'

export default defineEventHandler(async (event) => {
  const user = getUser()

  if (!user) {
    throw pruviousError(event, { statusCode: 401 })
  }

  const restoreId = castToNumber(getRouterParam(event, 'id'))

  if (!isPositiveInteger(restoreId)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'id' }),
    })
  }

  const query = await selectFrom('Restores')
    .select(['id', 'status', 'target', 'finishedAt'])
    .where('id', '=', restoreId)
    .first()

  if (!query.success || !query.data || !(await canAccessTarget(user, query.data.target as number))) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Restore not found'),
    })
  }

  return {
    status: query.data.status,
    finishedAt: query.data.finishedAt,
  }
})
