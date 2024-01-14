import { defineJob } from '../job.definition'

export default defineJob({
  name: 'clean-expired-previews',
  callback: async () => {
    const { query } = await import('#pruvious/server')
    await query('previews')
      .whereLt('updatedAt', Date.now() - 1000 * 60 * 60 * 24)
      .delete()
  },
  interval: 1800,
})
