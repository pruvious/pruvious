import { jobs } from '#pruvious/server'
import type { RuntimeConfig } from '@nuxt/schema'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import { db } from '../instances/database'
import { getModuleOption, intervals } from '../instances/state'
import { isObject } from '../utils/object'
import { joinRouteParts } from '../utils/string'
import type { JobAfterProcessContext } from './job.definition'

interface JobEntry<T extends keyof typeof jobs> {
  id: number
  name: T
  args: Parameters<(typeof jobs)[T]['callback']>
  jti: string
  priority: number
  createdAt: number
}

let jobQueueProcessingInitialized = false

export function initJobQueueProcessing(runtimeConfig: RuntimeConfig) {
  if (!jobQueueProcessingInitialized) {
    if (runtimeConfig.pruvious.jobs) {
      processJobQueue()
      intervals.push(setInterval(() => processJobQueue(), runtimeConfig.pruvious.jobs.searchInterval * 1000))

      for (const definition of Object.values(jobs)) {
        if (definition.interval !== false) {
          processJob(definition.name as any)
          intervals.push(setInterval(() => processJob(definition.name as any), definition.interval * 1000))
        }
      }
    }

    jobQueueProcessingInitialized = true
  }
}

/**
 * Immediately create and process a job with the specified `name` and its callback arguments.
 *
 * @returns A promise that resolves to an object containing information about the job processing,
 *          including the `success` state, `duration` in milliseconds, `processedAt` timestamp,
 *          and the `response` of the job callback function if successful, or an `error` if not.
 *
 * @see https://pruvious.com/docs/jobs
 */
export async function processJob<T extends keyof typeof jobs>(
  name: T,
  ...args: Parameters<(typeof jobs)[T]['callback']>
): Promise<JobAfterProcessContext<(typeof jobs)[T]['callback']>> {
  const apiOptions = getModuleOption('api')
  const job = await queueJob(name, ...args)

  if (apiOptions.routes['process-job.post']) {
    const token = jwt.sign({ jti: job.jti }, getModuleOption('jwt').secretKey, { expiresIn: '1 minute' })

    return $fetch<any>(joinRouteParts(apiOptions.prefix, apiOptions.routes['process-job.post']), {
      method: 'post',
      headers: { Authorization: `Bearer ${token}` },
    }).catch((error) => ({
      success: false,
      duration: 0,
      processedAt: Date.now(),
      error: isObject(error.data) && error.data.message ? error.data.message : error.data,
    }))
  }

  return { success: false, duration: 0, processedAt: Date.now(), error: 'Job processing route is disabled' }
}

/**
 * Initiate a job prcessing request.
 * Jobs are processed based on their `priority` and age, giving precedence to the oldest jobs.
 * This function continuously processes jobs until none are left.
 *
 * @see https://pruvious.com/docs/jobs
 */
export async function processJobQueue(): Promise<void> {
  const database = await db()
  const job: any = await database.model('_jobs').findOne({
    order: [
      ['priority', 'DESC'],
      ['created_at', 'ASC'],
    ],
  })

  if (job) {
    const apiOptions = getModuleOption('api')

    if (apiOptions.routes['process-job.post']) {
      const jti = nanoid()
      const token = jwt.sign({ jti }, getModuleOption('jwt').secretKey, { expiresIn: '1 minute' })

      await database.model('_jobs').update({ jti }, { where: { id: job.id } })

      await $fetch(joinRouteParts(apiOptions.prefix, apiOptions.routes['process-job.post']), {
        method: 'post',
        headers: { Authorization: `Bearer ${token}` },
      }).catch((error) => {
        return {
          success: false,
          duration: 0,
          processedAt: Date.now(),
          error: isObject(error.data) && error.data.message ? error.data.message : error.data,
        }
      })
    }

    await processJobQueue()
  }
}

/**
 * Create a job with the specified `name` and its callback arguments, and enqueue it for processing.
 * Workers periodically search for and process new jobs in the queue.
 *
 * @see https://pruvious.com/docs/jobs
 */
export async function queueJob<T extends keyof typeof jobs>(
  name: T,
  ...args: Parameters<(typeof jobs)[T]['callback']>
): Promise<JobEntry<T>> {
  const database = await db()
  const jti = nanoid()
  const createdAt = Date.now()
  const entry: any = await database
    .model('_jobs')
    .create({ name, args: JSON.stringify(args), jti, priority: jobs[name].priority, created_at: createdAt })

  return { id: entry.id, name, args, jti, priority: jobs[name].priority, createdAt }
}
