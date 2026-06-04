import { __, getUser, pruviousError, selectFrom } from '#pruvious/server'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import { defineEventHandler, getRouterParam } from 'h3'
import { canAccessTarget } from '../../../../utils/deployAccess'
import { forceReleaseSyncLock, readSyncLock } from '../../../../utils/syncLock'

export default defineEventHandler(async (event) => {
  const user = getUser()

  if (!user) {
    throw pruviousError(event, { statusCode: 401 })
  }

  const targetId = castToNumber(getRouterParam(event, 'id'))

  if (!isPositiveInteger(targetId)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'id' }),
    })
  }

  const targetQuery = await selectFrom('DeploymentTargets').where('id', '=', targetId).first()

  if (!targetQuery.success || !targetQuery.data) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Deployment target not found'),
    })
  }

  if (!(await canAccessTarget(user, targetId))) {
    throw pruviousError(event, {
      statusCode: 403,
      message: __('pruvious-api', 'You do not have permission to deploy this target'),
    })
  }

  const lock = await readSyncLock(targetId)

  if (!lock) {
    return { released: false, reason: 'no-lock' }
  }

  const ownerQuery = await selectFrom('Deployments')
    .select(['id', 'status'])
    .where('id', '=', lock.deploymentId)
    .first()
  const ownerStatus = ownerQuery.success && ownerQuery.data ? (ownerQuery.data.status as string) : null
  const ownerIsTerminal = ownerStatus === 'success' || ownerStatus === 'failed' || ownerStatus === null

  if (!ownerIsTerminal) {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'Cannot release the lock: deployment #$id is still active', {
        id: String(lock.deploymentId),
      }),
    })
  }

  await forceReleaseSyncLock(targetId)
  return { released: true }
})
