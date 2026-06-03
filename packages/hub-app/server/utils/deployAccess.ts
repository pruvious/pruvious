import { hasPermission, selectFrom } from '#pruvious/server'

const DEPLOY_PERMISSION = 'hub:deploy:execute'

/**
 * Returns the set of deployment-target ids the current user is allowed to interact with.
 * - Administrators get unrestricted access (returned as `null`).
 * - Non-admins must hold the `hub:deploy:execute` permission AND appear in the target's
 *   `deployers` list. The returned array may be empty if no targets match.
 */
export async function getAccessibleTargetIds(user: { id: number; isAdmin?: boolean }): Promise<number[] | null> {
  if (user.isAdmin) {
    return null
  }

  if (!hasPermission(DEPLOY_PERMISSION)) {
    return []
  }

  const query = await selectFrom('DeploymentTargets').select(['id']).where('deployers', 'includes', user.id).all()
  return query.success ? query.data.map((t) => t.id as number) : []
}

/**
 * Returns true if the current user can interact with the given deployment target.
 */
export async function canAccessTarget(user: { id: number; isAdmin?: boolean }, targetId: number): Promise<boolean> {
  if (user.isAdmin) {
    return true
  }

  if (!hasPermission(DEPLOY_PERMISSION)) {
    return false
  }

  const query = await selectFrom('DeploymentTargets')
    .where('id', '=', targetId)
    .where('deployers', 'includes', user.id)
    .count()

  return query.success && query.data > 0
}
