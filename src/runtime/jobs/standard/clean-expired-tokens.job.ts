import { defineJob } from '../job.definition'

export default defineJob({
  name: 'clean-expired-tokens',
  callback: async () => import('../../http/auth').then(({ cleanExpiredTokens }) => cleanExpiredTokens()),
  interval: 1800,
})
