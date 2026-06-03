import { $pfetchDashboard } from '#pruvious/dashboard'

let cache: Promise<{ ids: number[] | null }> | null = null

/**
 * Returns the set of deployment-target ids the current user is allowed to act on, or
 * `null` for unrestricted (admin / manage permission). Fetched once per page session.
 */
export function getAccessibleTargets(): Promise<{ ids: number[] | null }> {
  if (!cache) {
    cache = ($pfetchDashboard('/api/hub/me/accessible-targets') as Promise<{ ids: number[] | null }>).catch(() => ({
      ids: [],
    }))
  }
  return cache
}

/**
 * Synchronous check against the cached set. Returns `true` if the user has unrestricted
 * access (`ids === null`) or the target id is in their list. Always returns `false`
 * before the first `getAccessibleTargets()` resolves; call that on dashboard mount.
 */
let snapshot: { ids: number[] | null } | null = null

void getAccessibleTargets().then((result) => {
  snapshot = result
})

export function canActOnTarget(targetId: number | null | undefined): boolean {
  if (snapshot === null) {
    return false
  }
  if (snapshot.ids === null) {
    return true
  }
  return typeof targetId === 'number' && snapshot.ids.includes(targetId)
}
