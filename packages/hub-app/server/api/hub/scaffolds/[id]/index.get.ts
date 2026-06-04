import { __, getUser, pruviousError, selectFrom } from '#pruvious/server'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const user = getUser()

  if (!user) {
    throw pruviousError(event, { statusCode: 401 })
  }

  const scaffoldId = castToNumber(getRouterParam(event, 'id'))

  if (!isPositiveInteger(scaffoldId)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'id' }),
    })
  }

  const scaffoldQuery = await selectFrom('Scaffolds').where('id', '=', scaffoldId).first()

  if (!scaffoldQuery.success || !scaffoldQuery.data) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Scaffold not found'),
    })
  }

  const scaffold = scaffoldQuery.data

  const projectQuery = scaffold.project
    ? await selectFrom('Projects')
        .select(['id', 'name'])
        .where('id', '=', scaffold.project as number)
        .first()
    : null
  const project = projectQuery?.success && projectQuery.data ? projectQuery.data : null

  const triggeredByQuery = scaffold.triggeredBy
    ? await selectFrom('Users')
        .select(['id', 'email'])
        .where('id', '=', scaffold.triggeredBy as number)
        .first()
    : null
  const triggeredBy = triggeredByQuery?.success && triggeredByQuery.data ? triggeredByQuery.data : null

  return {
    scaffold: {
      id: scaffold.id,
      name: scaffold.name,
      targetDir: scaffold.targetDir,
      parentDir: scaffold.parentDir,
      languageCode: scaffold.languageCode,
      languageName: scaffold.languageName,
      packageManager: scaffold.packageManager,
      pruviousSpec: scaffold.pruviousSpec,
      install: scaffold.install,
      force: scaffold.force,
      status: scaffold.status,
      startedAt: scaffold.startedAt,
      finishedAt: scaffold.finishedAt,
      error: scaffold.error,
      logPath: scaffold.logPath,
    },
    project: project ? { id: project.id, name: project.name } : null,
    triggeredBy: triggeredBy ? { id: triggeredBy.id, email: triggeredBy.email } : null,
  }
})
