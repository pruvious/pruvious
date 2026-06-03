import { getUser, pruviousError, selectFrom } from '#pruvious/server'
import { castToNumber, clamp, isNotNull, isRealNumber } from '@pruvious/utils'
import { defineEventHandler, getQuery } from 'h3'
import { getAccessibleTargetIds } from '../../utils/deployAccess'

export default defineEventHandler(async (event) => {
  const user = getUser()

  if (!user) {
    throw pruviousError(event, { statusCode: 401 })
  }

  const rawLimit = castToNumber(getQuery(event).limit)
  const limit = clamp(isRealNumber(rawLimit) ? rawLimit : 10, 1, 50)

  const allowedTargetIds = await getAccessibleTargetIds(user)

  if (isNotNull(allowedTargetIds) && allowedTargetIds.length === 0) {
    return { deployments: [] }
  }

  const deploymentsQueryBuilder = selectFrom('Deployments')
    .select(['id', 'status', 'target', 'branch', 'commit', 'triggeredBy', 'startedAt', 'finishedAt', 'createdAt'])
    .orderBy('createdAt', 'desc')
    .limit(limit)

  if (isNotNull(allowedTargetIds)) {
    deploymentsQueryBuilder.where('target', 'in', allowedTargetIds)
  }

  const deploymentsQuery = await deploymentsQueryBuilder.all()

  if (!deploymentsQuery.success) {
    throw pruviousError(event, { statusCode: 500, message: deploymentsQuery.runtimeError })
  }

  const deployments = deploymentsQuery.data
  const targetIds = Array.from(new Set(deployments.map((d) => d.target as number).filter(Boolean)))
  const userIds = Array.from(new Set(deployments.map((d) => d.triggeredBy as number).filter(Boolean)))

  const targets = new Map<number, { id: number; name: string; type: string; project: number }>()
  const projects = new Map<number, string>()
  const users = new Map<number, string>()

  if (targetIds.length > 0) {
    const targetsQuery = await selectFrom('DeploymentTargets')
      .select(['id', 'name', 'type', 'project'])
      .where('id', 'in', targetIds)
      .all()
    if (targetsQuery.success) {
      for (const t of targetsQuery.data) {
        targets.set(t.id as number, {
          id: t.id as number,
          name: t.name as string,
          type: t.type as string,
          project: t.project as number,
        })
      }
    }

    const projectIds = Array.from(new Set([...targets.values()].map((t) => t.project)))
    if (projectIds.length > 0) {
      const projectsQuery = await selectFrom('Projects').select(['id', 'name']).where('id', 'in', projectIds).all()
      if (projectsQuery.success) {
        for (const p of projectsQuery.data) {
          projects.set(p.id as number, p.name as string)
        }
      }
    }
  }

  if (userIds.length > 0) {
    const usersQuery = await selectFrom('Users').select(['id', 'email']).where('id', 'in', userIds).all()
    if (usersQuery.success) {
      for (const u of usersQuery.data) {
        users.set(u.id as number, u.email as string)
      }
    }
  }

  return {
    deployments: deployments.map((d) => {
      const target = targets.get(d.target as number) ?? null
      const projectName = target ? (projects.get(target.project) ?? null) : null
      const triggeredByEmail = d.triggeredBy ? (users.get(d.triggeredBy as number) ?? null) : null

      return {
        id: d.id,
        status: d.status,
        branch: d.branch,
        commit: d.commit,
        startedAt: d.startedAt,
        finishedAt: d.finishedAt,
        createdAt: d.createdAt,
        target: target ? { id: target.id, name: target.name, type: target.type } : null,
        project: target ? { id: target.project, name: projectName } : null,
        triggeredBy: triggeredByEmail,
      }
    }),
  }
})
