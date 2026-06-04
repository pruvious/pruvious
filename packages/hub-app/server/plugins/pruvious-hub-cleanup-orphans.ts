import { database, i18n, primaryLanguage } from '#pruvious/server'

export default defineNitroPlugin((nitro) => {
  let done = false

  const qb = () => database().queryBuilder({ contextLanguage: primaryLanguage })

  const onRequest = async () => {
    if (done) {
      return
    }
    done = true

    try {
      const deployOrphans = await qb()
        .selectFrom('Deployments')
        .select(['id', 'target'])
        .orGroup([(eb) => eb.where('status', '=', 'queued'), (eb) => eb.where('status', '=', 'running')])
        .all()

      const scaffoldOrphans = await qb()
        .selectFrom('Scaffolds')
        .select(['id'])
        .orGroup([(eb) => eb.where('status', '=', 'queued'), (eb) => eb.where('status', '=', 'running')])
        .all()

      const hasDeployOrphans = deployOrphans.success && deployOrphans.data.length > 0
      const hasScaffoldOrphans = scaffoldOrphans.success && scaffoldOrphans.data.length > 0

      // Sync-lock recovery: any lock whose owning deployment is no longer
      // queued/running (or whose TTL has expired) is stale. This catches both
      // current orphans AND pre-crash stale locks that the next deploy might
      // not exercise (e.g. an in-worker deploy after a hub-side crash).
      const allTargets = await qb().selectFrom('DeploymentTargets').select(['id', 'syncLock']).all()
      const now = Date.now()

      if (allTargets.success) {
        for (const row of allTargets.data) {
          const lock = row.syncLock as { deploymentId?: number; expiresAt?: number } | null | undefined
          if (!lock) {
            continue
          }

          if (typeof lock.expiresAt === 'number' && lock.expiresAt <= now) {
            await qb()
              .update('DeploymentTargets')
              .set({ syncLock: null })
              .where('id', '=', row.id as number)
              .run()
            continue
          }

          const ownerId = Number(lock.deploymentId)
          if (!Number.isFinite(ownerId)) {
            await qb()
              .update('DeploymentTargets')
              .set({ syncLock: null })
              .where('id', '=', row.id as number)
              .run()
            continue
          }

          const owner = await qb().selectFrom('Deployments').select(['id', 'status']).where('id', '=', ownerId).first()
          const status = owner.success && owner.data ? (owner.data.status as string) : null
          if (status !== 'running' && status !== 'queued') {
            await qb()
              .update('DeploymentTargets')
              .set({ syncLock: null })
              .where('id', '=', row.id as number)
              .run()
          }
        }
      }

      if (!hasDeployOrphans && !hasScaffoldOrphans) {
        nitro.hooks.removeHook('request', onRequest)
        return
      }

      if (hasDeployOrphans) {
        const error = i18n.__$('pruvious-api', primaryLanguage, 'Hub-app restarted while this deploy was in progress')

        await qb()
          .update('Deployments')
          .set({ status: 'failed', error, finishedAt: now })
          .orGroup([(eb) => eb.where('status', '=', 'queued'), (eb) => eb.where('status', '=', 'running')])
          .run()

        const targetIds = Array.from(new Set(deployOrphans.data.map((d) => d.target as number).filter(Boolean)))

        for (const targetId of targetIds) {
          await qb()
            .update('DeploymentTargets')
            .set({ lastDeploymentStatus: 'failed' })
            .where('id', '=', targetId)
            .where('lastDeploymentStatus', '=', 'running')
            .run()
        }
      }

      if (hasScaffoldOrphans) {
        const error = i18n.__$('pruvious-api', primaryLanguage, 'Hub-app restarted while this scaffold was in progress')

        await qb()
          .update('Scaffolds')
          .set({ status: 'failed', error, finishedAt: now })
          .orGroup([(eb) => eb.where('status', '=', 'queued'), (eb) => eb.where('status', '=', 'running')])
          .run()
      }

      nitro.hooks.removeHook('request', onRequest)
    } catch (err: any) {
      done = false
      console.warn('[hub] orphan reconciliation failed, will retry:', err?.message ?? err)
    }
  }

  nitro.hooks.hook('request', onRequest)
})
