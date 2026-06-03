import { __, getUser, insertInto, pruviousError, queueJob, selectFrom, triggerQueueProcessing } from '#pruvious/server'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { canAccessTarget } from '../../../../utils/deployAccess'

const VALID_TYPES = ['db', 'uploads', 'full'] as const

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

  const body = (await readBody(event).catch(() => ({}))) as { type?: string }
  const type = body.type as (typeof VALID_TYPES)[number] | undefined

  if (!type || !VALID_TYPES.includes(type)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Invalid backup type'),
    })
  }

  const targetQuery = await selectFrom('DeploymentTargets').where('id', '=', targetId).first()

  if (!targetQuery.success || !targetQuery.data || !(await canAccessTarget(user, targetId))) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Deployment target not found'),
    })
  }

  const target = targetQuery.data

  const inFlightQuery = await selectFrom('Backups')
    .where('target', '=', target.id)
    .orGroup([(eb) => eb.where('status', '=', 'queued'), (eb) => eb.where('status', '=', 'running')])
    .first()

  if (inFlightQuery.success && inFlightQuery.data) {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'A backup is already queued or running for this target'),
    })
  }

  const created = await insertInto('Backups')
    .values({
      target: target.id,
      type,
      triggeredBy: user.id,
      status: 'queued',
    })
    .returningAll()
    .run()

  if (!created.success || !created.data?.[0]) {
    throw pruviousError(event, {
      statusCode: 500,
      message: __('pruvious-api', 'Failed to create backup'),
    })
  }

  const backupId = created.data[0].id as number

  await queueJob('hub-backup', { backupId, priority: 100 })
  void triggerQueueProcessing()

  return { backupId }
})
