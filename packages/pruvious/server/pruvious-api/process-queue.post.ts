import {
  getTokenFromAuthorizationHeader,
  processNextJob,
  pruviousError,
  resolveContextLanguage,
  resolveCurrentUser,
  triggerQueueProcessing,
} from '#pruvious/server'

export default defineEventHandler(async (event) => {
  const token = getTokenFromAuthorizationHeader()
  const { queue } = useRuntimeConfig().pruvious

  if (token !== queue.secret) {
    throw pruviousError(event, { statusCode: 401 })
  }

  await resolveContextLanguage()
  await resolveCurrentUser()

  const result = await processNextJob()

  if (result && queue.mode === 'auto') {
    event.waitUntil(triggerQueueProcessing())
  }

  return { success: true }
})
