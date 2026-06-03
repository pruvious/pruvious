import { database, primaryLanguage } from '#pruvious/server'

const DEPLOYER_ROLE_NAME = 'Deployer'

const DEPLOYER_PERMISSIONS = [
  'access-dashboard',
  'update-own-account',
  'collection:projects:read',
  'collection:deployment-targets:read',
  'collection:deployments:read',
  'collection:deployments:delete',
  'collection:backups:read',
  'collection:backups:delete',
  'collection:restores:read',
  'collection:restores:delete',
  'hub:deploy:execute',
]

export default defineNitroPlugin((nitro) => {
  let done = false

  const qb = () => database().queryBuilder({ contextLanguage: primaryLanguage })

  const onRequest = async () => {
    if (done) {
      return
    }
    done = true

    try {
      const existing = await qb().selectFrom('Roles').where('name', '=', DEPLOYER_ROLE_NAME).count()

      if (existing.success && existing.data === 0) {
        await qb().insertInto('Roles').values({ name: DEPLOYER_ROLE_NAME, permissions: DEPLOYER_PERMISSIONS }).run()
      }

      nitro.hooks.removeHook('request', onRequest)
    } catch (err: any) {
      done = false
      console.warn('[hub] role seed failed, will retry:', err?.message ?? err)
    }
  }

  nitro.hooks.hook('request', onRequest)
})
