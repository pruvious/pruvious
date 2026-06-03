import { __, getUser, insertInto, pruviousError, queueJob, selectFrom, triggerQueueProcessing } from '#pruvious/server'
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

  const targetQuery = await selectFrom('DeploymentTargets').where('id', '=', targetId).first()

  if (!targetQuery.success || !targetQuery.data) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Deployment target not found'),
    })
  }

  const target = targetQuery.data

  if (!(await canAccessTarget(user, target.id as number))) {
    throw pruviousError(event, {
      statusCode: 403,
      message: __('pruvious-api', 'You do not have permission to deploy this target'),
    })
  }

  const inFlightQuery = await selectFrom('Deployments')
    .where('target', '=', target.id)
    .orGroup([(eb) => eb.where('status', '=', 'queued'), (eb) => eb.where('status', '=', 'running')])
    .first()

  if (inFlightQuery.success && inFlightQuery.data) {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'A deployment is already queued or running for this target'),
    })
  }

  const created = await insertInto('Deployments')
    .values({
      target: target.id,
      branch: (target.branch as string | null) ?? null,
      triggeredBy: user.id,
      status: 'queued',
    })
    .returningAll()
    .run()

  if (!created.success || !created.data?.[0]) {
    throw pruviousError(event, {
      statusCode: 500,
      message: __('pruvious-api', 'Failed to create deployment'),
    })
  }

  const deploymentId = created.data[0].id as number

  await queueJob('hub-deploy', { deploymentId, priority: 100 })
  void triggerQueueProcessing()

  return { deploymentId }
})
