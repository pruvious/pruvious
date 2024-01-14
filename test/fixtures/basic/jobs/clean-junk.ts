import { defineJob } from '#pruvious'
import { query } from '#pruvious/server'

export default defineJob({
  name: 'clean-junk',
  callback: async () => query('junk').delete(),
  beforeProcess: async () => query('junk').create({}),
  afterProcess: async () => query('junk').create({}),
})
