import {
  __,
  getUser,
  hasPermission,
  insertInto,
  pruviousError,
  queueJob,
  selectFrom,
  triggerQueueProcessing,
} from '#pruvious/server'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const user = getUser()

  if (!user) {
    throw pruviousError(event, { statusCode: 401 })
  }

  if (!hasPermission('collection:projects:create')) {
    throw pruviousError(event, { statusCode: 403 })
  }

  const scaffoldId = castToNumber(getRouterParam(event, 'id'))

  if (!isPositiveInteger(scaffoldId)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'id' }),
    })
  }

  const previousQuery = await selectFrom('Scaffolds').where('id', '=', scaffoldId).first()

  if (!previousQuery.success || !previousQuery.data) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Scaffold not found'),
    })
  }

  const previous = previousQuery.data

  if (previous.status !== 'failed') {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'Only failed scaffolds can be retried'),
    })
  }

  const inFlight = await selectFrom('Scaffolds')
    .orGroup([(eb) => eb.where('status', '=', 'queued'), (eb) => eb.where('status', '=', 'running')])
    .first()

  if (inFlight.success && inFlight.data) {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'A scaffold is already queued or running'),
    })
  }

  const nameClash = await selectFrom('Projects')
    .where('name', '=', previous.name as string)
    .first()

  if (nameClash.success && nameClash.data) {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'A project with this name already exists'),
    })
  }

  const pathClash = await selectFrom('Projects')
    .where('path', '=', previous.targetDir as string)
    .first()

  if (pathClash.success && pathClash.data) {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'A project at this path already exists'),
    })
  }

  const created = await insertInto('Scaffolds')
    .values({
      name: previous.name as string,
      targetDir: previous.targetDir as string,
      parentDir: previous.parentDir as string,
      languageCode: previous.languageCode as string,
      languageName: (previous.languageName as string | null) ?? null,
      packageManager: previous.packageManager as 'npm' | 'pnpm',
      pruviousSpec: previous.pruviousSpec as string,
      install: Boolean(previous.install),
      force: true,
      status: 'queued',
      triggeredBy: user.id,
    })
    .returningAll()
    .run()

  if (!created.success || !created.data?.[0]) {
    throw pruviousError(event, {
      statusCode: 500,
      message: __('pruvious-api', 'Failed to create scaffold'),
    })
  }

  const newScaffoldId = created.data[0].id as number

  await queueJob('hub-scaffold', { scaffoldId: newScaffoldId, priority: 100 })
  void triggerQueueProcessing()

  return { scaffoldId: newScaffoldId }
})
