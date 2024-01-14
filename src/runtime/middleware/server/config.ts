import { useRuntimeConfig } from '#imports'
import { defineEventHandler } from 'h3'
import { cacheModuleOptions } from '../../instances/state'
import { initJobQueueProcessing } from '../../jobs/job.utils'

export default defineEventHandler(async () => {
  const runtimeConfig = useRuntimeConfig()

  cacheModuleOptions(runtimeConfig)
  initJobQueueProcessing(runtimeConfig)
})
