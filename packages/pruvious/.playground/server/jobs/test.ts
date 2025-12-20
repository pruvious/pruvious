import { defineJob } from '#pruvious/server'

export default defineJob({
  handler: () => ({ test: Date.toString() }),
})
