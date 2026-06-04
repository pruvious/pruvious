import { __, getUser, pruviousError, selectFrom } from '#pruvious/server'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import { defineEventHandler, getRouterParam } from 'h3'
import { canAccessTarget } from '../../../../utils/deployAccess'

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

  if (!(await canAccessTarget(user, targetId))) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Deployment target not found'),
    })
  }

  const targetQuery = await selectFrom('DeploymentTargets')
    .select(['id', 'lastDeploymentStatus', 'syncLock'])
    .where('id', '=', targetId)
    .first()

  if (!targetQuery.success || !targetQuery.data) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Deployment target not found'),
    })
  }

  const lock = targetQuery.data.syncLock as
    | { deploymentId: number; acquiredAt: number; expiresAt: number }
    | null
    | undefined

  let lockOwnerStatus: string | null = null
  if (lock) {
    const ownerQuery = await selectFrom('Deployments')
      .select(['id', 'status'])
      .where('id', '=', lock.deploymentId)
      .first()
    if (ownerQuery.success && ownerQuery.data) {
      lockOwnerStatus = ownerQuery.data.status as string
    }
  }

  return {
    lastDeploymentStatus: targetQuery.data.lastDeploymentStatus,
    syncLock: lock
      ? {
          deploymentId: lock.deploymentId,
          acquiredAt: lock.acquiredAt,
          expiresAt: lock.expiresAt,
          ownerStatus: lockOwnerStatus,
        }
      : null,
  }
})
