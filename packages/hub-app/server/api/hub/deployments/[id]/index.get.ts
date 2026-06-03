import { __, getUser, pruviousError, selectFrom } from '#pruvious/server'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import { defineEventHandler, getRouterParam } from 'h3'
import { canAccessTarget } from '../../../../utils/deployAccess'

export default defineEventHandler(async (event) => {
  const user = getUser()

  if (!user) {
    throw pruviousError(event, { statusCode: 401 })
  }

  const deploymentId = castToNumber(getRouterParam(event, 'id'))

  if (!isPositiveInteger(deploymentId)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'id' }),
    })
  }

  const deploymentQuery = await selectFrom('Deployments').where('id', '=', deploymentId).first()

  if (!deploymentQuery.success || !deploymentQuery.data) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Deployment not found'),
    })
  }

  const deployment = deploymentQuery.data

  if (!(await canAccessTarget(user, deployment.target as number))) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Deployment not found'),
    })
  }

  const targetQuery = await selectFrom('DeploymentTargets')
    .select(['id', 'name', 'type', 'project'])
    .where('id', '=', deployment.target as number)
    .first()
  const target = targetQuery.success && targetQuery.data ? targetQuery.data : null

  const projectQuery = target
    ? await selectFrom('Projects')
        .select(['id', 'name'])
        .where('id', '=', target.project as number)
        .first()
    : null
  const project = projectQuery?.success && projectQuery.data ? projectQuery.data : null

  const triggeredByQuery = deployment.triggeredBy
    ? await selectFrom('Users')
        .select(['id', 'email'])
        .where('id', '=', deployment.triggeredBy as number)
        .first()
    : null
  const triggeredBy = triggeredByQuery?.success && triggeredByQuery.data ? triggeredByQuery.data : null

  let canRedeploy = false
  if (target) {
    const inFlightQuery = await selectFrom('Deployments')
      .where('target', '=', target.id)
      .orGroup([(eb) => eb.where('status', '=', 'queued'), (eb) => eb.where('status', '=', 'running')])
      .first()
    canRedeploy = !(inFlightQuery.success && inFlightQuery.data)
  }

  return {
    deployment: {
      id: deployment.id,
      status: deployment.status,
      branch: deployment.branch,
      commit: deployment.commit,
      startedAt: deployment.startedAt,
      finishedAt: deployment.finishedAt,
      error: deployment.error,
      logPath: deployment.logPath,
    },
    target: target ? { id: target.id, name: target.name, type: target.type } : null,
    project: project ? { id: project.id, name: project.name } : null,
    triggeredBy: triggeredBy ? { id: triggeredBy.id, email: triggeredBy.email } : null,
    canRedeploy,
  }
})
