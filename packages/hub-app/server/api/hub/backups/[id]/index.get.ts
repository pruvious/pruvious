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

  const backupQuery = await selectFrom('Backups').where('id', '=', backupId).first()

  if (!backupQuery.success || !backupQuery.data || !(await canAccessTarget(user, backupQuery.data.target as number))) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Backup not found'),
    })
  }

  const backup = backupQuery.data
  const targetQuery = await selectFrom('DeploymentTargets')
    .select(['id', 'name', 'type'])
    .where('id', '=', backup.target as number)
    .first()
  const target =
    targetQuery.success && targetQuery.data
      ? {
          id: targetQuery.data.id as number,
          name: targetQuery.data.name as string,
          type: targetQuery.data.type as string,
        }
      : null

  let triggeredBy: { id: number; email: string } | null = null
  if (backup.triggeredBy) {
    const userQuery = await selectFrom('Users')
      .select(['id', 'email'])
      .where('id', '=', backup.triggeredBy as number)
      .first()
    if (userQuery.success && userQuery.data) {
      triggeredBy = { id: userQuery.data.id as number, email: userQuery.data.email as string }
    }
  }

  return {
    backup: {
      id: backup.id,
      type: backup.type,
      status: backup.status,
      startedAt: backup.startedAt,
      finishedAt: backup.finishedAt,
      sizeBytes: backup.sizeBytes,
      error: backup.error,
      storagePath: backup.storagePath,
    },
    target,
    triggeredBy,
  }
})
