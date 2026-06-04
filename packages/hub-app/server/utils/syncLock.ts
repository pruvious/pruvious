import { database, primaryLanguage } from '#pruvious/server'

export interface SyncLock {
  deploymentId: number
  acquiredAt: number
  expiresAt: number
}

export interface AcquireSyncLockResult {
  acquired: boolean
  heldBy?: SyncLock
}

const qb = () => database().queryBuilder({ contextLanguage: primaryLanguage })

/**
 * Attempts to acquire a TTL-bounded sync lock on a `DeploymentTargets` row.
 *
 * The lock lives on the target itself (not in the project's D1) so a crashed
 * sync inside the worker cannot leave the project's database holding a stale
 * lock. A held lock is considered stale once `expiresAt` is in the past.
 */
export async function acquireSyncLock(
  targetId: number,
  deploymentId: number,
  ttlMs: number,
): Promise<AcquireSyncLockResult> {
  const current = await readSyncLock(targetId)
  const now = Date.now()

  if (current && current.deploymentId !== deploymentId && current.expiresAt > now) {
    return { acquired: false, heldBy: current }
  }

  const lock: SyncLock = { deploymentId, acquiredAt: now, expiresAt: now + ttlMs }
  const result = await qb().update('DeploymentTargets').set({ syncLock: lock }).where('id', '=', targetId).run()

  if (!result.success) {
    return { acquired: false }
  }

  return { acquired: true }
}

export async function extendSyncLock(targetId: number, deploymentId: number, ttlMs: number): Promise<boolean> {
  const current = await readSyncLock(targetId)
  if (!current || current.deploymentId !== deploymentId) {
    return false
  }

  const lock: SyncLock = { deploymentId, acquiredAt: current.acquiredAt, expiresAt: Date.now() + ttlMs }
  const result = await qb().update('DeploymentTargets').set({ syncLock: lock }).where('id', '=', targetId).run()
  return result.success
}

export async function releaseSyncLock(targetId: number, deploymentId: number): Promise<boolean> {
  const current = await readSyncLock(targetId)
  if (!current || current.deploymentId !== deploymentId) {
    return false
  }

  const result = await qb().update('DeploymentTargets').set({ syncLock: null }).where('id', '=', targetId).run()
  return result.success
}

export async function forceReleaseSyncLock(targetId: number): Promise<boolean> {
  const result = await qb().update('DeploymentTargets').set({ syncLock: null }).where('id', '=', targetId).run()
  return result.success
}

export async function readSyncLock(targetId: number): Promise<SyncLock | null> {
  const result = await qb().selectFrom('DeploymentTargets').select(['syncLock']).where('id', '=', targetId).first()
  if (!result.success || !result.data) {
    return null
  }

  const raw = result.data.syncLock as SyncLock | null | undefined
  if (!raw || typeof raw !== 'object') {
    return null
  }

  return {
    deploymentId: Number(raw.deploymentId),
    acquiredAt: Number(raw.acquiredAt),
    expiresAt: Number(raw.expiresAt),
  }
}
