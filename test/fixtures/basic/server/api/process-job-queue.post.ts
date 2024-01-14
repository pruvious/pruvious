import { processJobQueue, queueJob } from '#pruvious/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  await queueJob('clean-junk')
  await processJobQueue()
  return true
})
