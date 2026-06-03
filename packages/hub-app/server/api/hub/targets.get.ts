import { getUser, pruviousError, selectFrom } from '#pruvious/server'
import { isNotNull } from '@pruvious/utils'
import { defineEventHandler } from 'h3'
import { getAccessibleTargetIds } from '../../utils/deployAccess'

export default defineEventHandler(async (event) => {
  const user = getUser()

  if (!user) {
    throw pruviousError(event, { statusCode: 401 })
  }

  const allowedTargetIds = await getAccessibleTargetIds(user)

  if (isNotNull(allowedTargetIds) && allowedTargetIds.length === 0) {
    return { targets: [] }
  }

  const targetsQueryBuilder = selectFrom('DeploymentTargets')
    .select(['id', 'name', 'type', 'project', 'branch', 'lastDeploymentStatus'])
    .orderBy('name', 'asc')

  if (isNotNull(allowedTargetIds)) {
    targetsQueryBuilder.where('id', 'in', allowedTargetIds)
  }

  const targetsQuery = await targetsQueryBuilder.all()

  if (!targetsQuery.success) {
    throw pruviousError(event, { statusCode: 500, message: targetsQuery.runtimeError })
  }

  const projectIds = Array.from(new Set(targetsQuery.data.map((t) => t.project as number).filter(Boolean)))
  const projectMap = new Map<number, string>()

  if (projectIds.length > 0) {
    const projectsQuery = await selectFrom('Projects').select(['id', 'name']).where('id', 'in', projectIds).all()

    if (projectsQuery.success) {
      for (const p of projectsQuery.data) {
        projectMap.set(p.id as number, p.name as string)
      }
    }
  }

  const targetIds = targetsQuery.data.map((t) => t.id as number)
  const lastDeploymentAt = new Map<number, number>()

  if (targetIds.length > 0) {
    const deploymentsQuery = await selectFrom('Deployments')
      .select(['target', 'createdAt'])
      .where('target', 'in', targetIds)
      .orderBy('createdAt', 'desc')
      .all()

    if (deploymentsQuery.success) {
      for (const row of deploymentsQuery.data) {
        const targetId = row.target as number
        if (!lastDeploymentAt.has(targetId)) {
          lastDeploymentAt.set(targetId, row.createdAt as number)
        }
      }
    }
  }

  return {
    targets: targetsQuery.data.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      project: { id: t.project, name: projectMap.get(t.project as number) ?? '' },
      branch: t.branch,
      lastDeploymentAt: lastDeploymentAt.get(t.id as number) ?? null,
      lastDeploymentStatus: t.lastDeploymentStatus,
    })),
  }
})
