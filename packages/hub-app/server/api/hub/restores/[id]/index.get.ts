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

  const restoreQuery = await selectFrom('Restores').where('id', '=', restoreId).first()

  if (
    !restoreQuery.success ||
    !restoreQuery.data ||
    !(await canAccessTarget(user, restoreQuery.data.target as number))
  ) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Restore not found'),
    })
  }

  const restore = restoreQuery.data

  const targetQuery = await selectFrom('DeploymentTargets')
    .select(['id', 'name', 'type'])
    .where('id', '=', restore.target as number)
    .first()
  const target =
    targetQuery.success && targetQuery.data
      ? {
          id: targetQuery.data.id as number,
          name: targetQuery.data.name as string,
          type: targetQuery.data.type as string,
        }
      : null

  const backupQuery = await selectFrom('Backups')
    .select(['id', 'type'])
    .where('id', '=', restore.backup as number)
    .first()
  const backup =
    backupQuery.success && backupQuery.data
      ? { id: backupQuery.data.id as number, type: backupQuery.data.type as string }
      : null

  let triggeredBy: { id: number; email: string } | null = null
  if (restore.triggeredBy) {
    const userQuery = await selectFrom('Users')
      .select(['id', 'email'])
      .where('id', '=', restore.triggeredBy as number)
      .first()
    if (userQuery.success && userQuery.data) {
      triggeredBy = { id: userQuery.data.id as number, email: userQuery.data.email as string }
    }
  }

  return {
    restore: {
      id: restore.id,
      status: restore.status,
      startedAt: restore.startedAt,
      finishedAt: restore.finishedAt,
      error: restore.error,
    },
    target,
    backup,
    triggeredBy,
  }
})
