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

      if (!hasDeployOrphans && !hasScaffoldOrphans) {
        nitro.hooks.removeHook('request', onRequest)
        return
      }

      const now = Date.now()

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
