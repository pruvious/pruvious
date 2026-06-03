import { __, getUser, insertInto, pruviousError, queueJob, selectFrom, triggerQueueProcessing } from '#pruvious/server'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import { defineEventHandler, getRouterParam, readBody } from 'h3'
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

  const body = (await readBody(event).catch(() => ({}))) as { confirm?: boolean; wipeMissingObjects?: boolean }

  if (body.confirm !== true) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Restore requires explicit confirmation'),
    })
  }

  const backupQuery = await selectFrom('Backups').where('id', '=', backupId).first()

  if (!backupQuery.success || !backupQuery.data) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Backup not found'),
    })
  }

  const backup = backupQuery.data
  const targetId = backup.target as number

  if (!(await canAccessTarget(user, targetId))) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Backup not found'),
    })
  }

  if (backup.status !== 'success') {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'Backup cannot be restored before it finishes successfully'),
    })
  }

  const inFlightQuery = await selectFrom('Restores')
    .where('target', '=', targetId)
    .orGroup([(eb) => eb.where('status', '=', 'queued'), (eb) => eb.where('status', '=', 'running')])
    .first()

  if (inFlightQuery.success && inFlightQuery.data) {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'A restore is already queued or running for this target'),
    })
  }

  const created = await insertInto('Restores')
    .values({
      backup: backupId,
      target: targetId,
      triggeredBy: user.id,
      status: 'queued',
    })
    .returningAll()
    .run()

  if (!created.success || !created.data?.[0]) {
    throw pruviousError(event, {
      statusCode: 500,
      message: __('pruvious-api', 'Failed to create restore'),
    })
  }

  const restoreId = created.data[0].id as number

  await queueJob('hub-restore', {
    restoreId,
    wipeMissingObjects: body.wipeMissingObjects === true,
    priority: 100,
  })
  void triggerQueueProcessing()

  return { restoreId }
})
