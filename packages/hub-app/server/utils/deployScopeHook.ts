import { database } from '#pruvious/server'
import type { CollectionHooks } from '@pruvious/orm'

type BeforeQueryPreparationHook = Required<CollectionHooks>['beforeQueryPreparation'][number]
type HookContext = Parameters<BeforeQueryPreparationHook>[0]

/**
 * Returns the user id whose accessible-targets list should constrain this query, or `null`
 * when the query should run unscoped. Skips internal/non-guarded queries, non-select
 * operations, anonymous requests, and users who already hold the collection's `:manage`
 * permission (admins land here too, since their permission set is total).
 */
function resolveScopingUserId(context: HookContext, managePermission: string): number | null {
  if (!context.customData._guarded) {
    return null
  }

  if (context.operation !== 'select') {
    return null
  }

  const event = useEvent()
  const auth = event.context.pruvious.auth

  if (!auth.isLoggedIn) {
    return null
  }

  if (auth.permissions.includes(managePermission as any)) {
    return null
  }

  return auth.user.id
}

/**
 * Scopes `DeploymentTargets` reads to rows where the current user is listed in `deployers`.
 */
export function scopeDeploymentTargetsByDeployer(): BeforeQueryPreparationHook {
  return async (context) => {
    const userId = resolveScopingUserId(context, 'collection:deployment-targets:manage')
    if (userId === null) {
      return
    }

    ;(context.queryBuilder as any).where('deployers', 'includes', userId)
  }
}

/**
 * Scopes reads to rows whose `target` field points to a DeploymentTarget the current user
 * is listed in. Used by `Deployments` and `Backups`, which both reference targets directly.
 */
export function scopeByAccessibleTargets(managePermission: string): BeforeQueryPreparationHook {
  return async (context) => {
    const userId = resolveScopingUserId(context, managePermission)
    if (userId === null) {
      return
    }

    const accessible = await database()
      .queryBuilder()
      .selectFrom('DeploymentTargets')
      .select(['id'])
      .where('deployers', 'includes', userId)
      .all()

    const ids = accessible.success ? accessible.data.map((t) => t.id as number) : []

    if (ids.length === 0) {
      ;(context.queryBuilder as any).where('id', '=', 0)
      return
    }

    ;(context.queryBuilder as any).where('target', 'in', ids)
  }
}

/**
 * Scopes `Projects` reads to projects that own at least one DeploymentTarget the current
 * user is listed in.
 */
export function scopeProjectsByAccessibleTargets(): BeforeQueryPreparationHook {
  return async (context) => {
    const userId = resolveScopingUserId(context, 'collection:projects:manage')
    if (userId === null) {
      return
    }

    const accessible = await database()
      .queryBuilder()
      .selectFrom('DeploymentTargets')
      .select(['project'])
      .where('deployers', 'includes', userId)
      .all()

    const projectIds = accessible.success ? Array.from(new Set(accessible.data.map((t) => t.project as number))) : []

    if (projectIds.length === 0) {
      ;(context.queryBuilder as any).where('id', '=', 0)
      return
    }

    ;(context.queryBuilder as any).where('id', 'in', projectIds)
  }
}
