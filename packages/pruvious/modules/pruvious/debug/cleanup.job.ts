import { defineJob, getLogsDatabase } from '#pruvious/server'
import { toSeconds } from '@pruvious/utils'

const { maxAge, interval } = useRuntimeConfig().pruvious.debug.logs.cleanup

export default defineJob({
  handler: async () => {
    const db = getLogsDatabase()
    const maxTime = Date.now() - toSeconds(maxAge) * 1000

    return Promise.all([
      db.queryBuilder().deleteFrom('Queries').where('createdAt', '<', maxTime).run(),
      db.queryBuilder().deleteFrom('Requests').where('createdAt', '<', maxTime).run(),
      db.queryBuilder().deleteFrom('Responses').where('createdAt', '<', maxTime).run(),
      db.queryBuilder().deleteFrom('Queue').where('createdAt', '<', maxTime).run(),
      db.queryBuilder().deleteFrom('Errors').where('createdAt', '<', maxTime).run(),
      db.queryBuilder().deleteFrom('Custom').where('createdAt', '<', maxTime).run(),
    ])
  },
  logs: false,
  schedule: { interval },
})
