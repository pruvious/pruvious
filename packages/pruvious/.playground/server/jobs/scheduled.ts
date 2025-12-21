import { defineJob } from '#pruvious/server'

export default defineJob({
  handler: (options: { queuedAt: number }) => {
    return `Queued at: ${new Date(options.queuedAt).toLocaleString()}`
  },
  schedule: {
    interval: '30m',
    payload: () => ({ queuedAt: Date.now() }),
  },
})
