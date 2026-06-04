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
import { isString, slugify } from '@pruvious/utils'
import { languageCodePattern, languageName, resolvePruviousSpec } from 'create-pruvious'
import { defineEventHandler, readBody } from 'h3'
import fs from 'node:fs'
import { isAbsolute, join } from 'pathe'

const supportedPackageManagers = ['npm', 'pnpm'] as const
type SupportedPackageManager = (typeof supportedPackageManagers)[number]

export default defineEventHandler(async (event) => {
  const user = getUser()

  if (!user) {
    throw pruviousError(event, { statusCode: 401 })
  }

  if (!hasPermission('collection:projects:create')) {
    throw pruviousError(event, { statusCode: 403 })
  }

  const body = (await readBody(event)) as Record<string, unknown> | null

  const name = isString(body?.name) ? body.name.trim() : ''
  const parentDir = isString(body?.parentDir) ? body.parentDir.trim() : ''
  const languageCode = isString(body?.languageCode) ? body.languageCode.trim() : 'en'
  const packageManager = isString(body?.packageManager) ? (body.packageManager as SupportedPackageManager) : 'npm'
  const pruviousSpecInput = isString(body?.pruviousSpec) ? body.pruviousSpec.trim() : 'alpha'
  const install = body?.install === false ? false : true
  const force = body?.force === true

  if (!name) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'name' }),
    })
  }

  if (!parentDir || !isAbsolute(parentDir)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Parent directory must be an absolute path'),
    })
  }

  if (!languageCodePattern.test(languageCode)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Invalid language code'),
    })
  }

  if (!supportedPackageManagers.includes(packageManager)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Invalid package manager'),
    })
  }

  let parentStat: fs.Stats
  try {
    parentStat = fs.statSync(parentDir)
  } catch {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Parent directory does not exist'),
    })
  }

  if (!parentStat.isDirectory()) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Parent directory does not exist'),
    })
  }

  try {
    fs.accessSync(parentDir, fs.constants.W_OK)
  } catch {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Parent directory is not writable'),
    })
  }

  const slug = slugify(name)

  if (!slug) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'name' }),
    })
  }

  const targetDir = join(parentDir, slug)

  if (fs.existsSync(targetDir) && !force) {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'Target directory already exists'),
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

  const nameClash = await selectFrom('Projects').where('name', '=', name).first()

  if (nameClash.success && nameClash.data) {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'A project with this name already exists'),
    })
  }

  const pathClash = await selectFrom('Projects').where('path', '=', targetDir).first()

  if (pathClash.success && pathClash.data) {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'A project at this path already exists'),
    })
  }

  const pruviousSpec = await resolvePruviousSpec(pruviousSpecInput || 'alpha')

  const created = await insertInto('Scaffolds')
    .values({
      name,
      targetDir,
      parentDir,
      languageCode,
      languageName: languageName(languageCode),
      packageManager,
      pruviousSpec,
      install,
      force,
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

  const scaffoldId = created.data[0].id as number

  await queueJob('hub-scaffold', { scaffoldId, priority: 100 })
  void triggerQueueProcessing()

  return { scaffoldId }
})
