import type { Jobs } from '#pruvious/server'
import type { QueryBuilderResult } from '@pruvious/orm'
import {
  anonymizeObject,
  isDefined,
  isNull,
  isNumber,
  isObject,
  isPositiveInteger,
  omit,
  pick,
  randomIdentifier,
  toArray,
  toDate,
} from '@pruvious/utils'
import { colorize } from 'consola/utils'
import safeStringify from 'safe-stringify'
import { debug } from '../debug/console'
import type { queueCollection, QueuedJob } from './collection'

interface JobResultDetails<TName extends keyof Jobs> {
  /**
   * An object containing details about the queued job.
   */
  details: QueuedJob<TName>
}

interface JobResultSuccess<TName extends keyof Jobs> {
  /**
   * Indicates that the job was processed successfully.
   */
  success: true

  /**
   * The result data returned by the job handler.
   */
  data: Jobs[TName]['TResultData']
}

interface JobResultError {
  /**
   * Indicates that an error occurred while processing the job.
   */
  success: false

  /**
   * The error message thrown by the job handler.
   */
  error: string
}

export type JobResult<TName extends keyof Jobs> = JobResultDetails<TName> & (JobResultSuccess<TName> | JobResultError)

export type QueueJobOptions<TPayload extends Record<string, any>> = {
  /**
   * A numeric value that defines how important this job is compared to others.
   * Higher numbers mean the job will run sooner than jobs with lower numbers.
   * If two jobs have equal priority, they run in the order they were added to the queue.
   *
   * If omitted, it defaults to the `defaultPriority` specified in the job definition.
   */
  priority?: number

  /**
   * The scheduled date and time for job execution.
   * If omitted or set to `null`, job processing starts right away.
   */
  scheduledAt?: number | string | Date | null
} & ([TPayload] extends [never] ? {} : TPayload)

/**
 * Adds a job to the processing queue.
 * The job must be defined in the `server/jobs/` directory before usage.
 *
 * @returns a `Promise` that resolves to a `QueuedJob` object.
 *
 * @example
 * ```ts
 * await queueJob('send-email', {
 *   to: 'hello@pruvious.com',
 *   subject: 'Hello!',
 *   body: '...',
 * })
 * ```
 */
export async function queueJob<
  TName extends keyof Jobs,
  TPayload extends Jobs[TName]['TPayload'] = Jobs[TName]['TPayload'],
>(
  name: TName,
  options: QueueJobOptions<TPayload>,
): Promise<QueryBuilderResult<QueuedJob<TName>, Record<string, string>>> {
  return _queueJob(name, options)
}

/**
 * Adds a unique job to the processing queue.
 * Ensures only one instance of a job with the specified `key` exists at a time.
 * The job must be defined in the `server/jobs/` directory before usage.
 *
 * @returns a `Promise` that resolves to a `QueuedJob` object.
 *
 * @example
 * ```ts
 * await queueUniqueJob('optimize-image', 'thumbnail:1337', {
 *   uploadId: 1337,
 *   options: { format: 'webp', width: 320, height: 320 },
 * })
 * ```
 */
export async function queueUniqueJob<
  TName extends keyof Jobs,
  TPayload extends Jobs[TName]['TPayload'] = Jobs[TName]['TPayload'],
>(
  name: TName,
  key: string,
  options: QueueJobOptions<TPayload>,
): Promise<QueryBuilderResult<QueuedJob<TName>, Record<string, string>>> {
  return _queueJob(name, options, { key })
}

async function _queueJob<TName extends keyof Jobs, TPayload extends Jobs[TName]['TPayload'] = Jobs[TName]['TPayload']>(
  name: TName,
  options: QueueJobOptions<TPayload>,
  jobFields?: { key?: string | null; attempt?: number },
): Promise<QueryBuilderResult<QueuedJob<TName>, Record<string, string>>> {
  const { jobs, getQueueDatabase, getLogsDatabase } = await import('#pruvious/server')
  const definition = jobs[name]

  if (!definition) {
    throw new Error(`Job \`${name}\` is not defined`)
  }

  const runtimeConfig = useRuntimeConfig()
  const queueDatabase = getQueueDatabase()
  const logsDatabase = getLogsDatabase()
  const payload = omit(options, ['priority', 'scheduledAt'])
  const priority = options.priority ?? definition.defaultPriority
  const scheduledAt =
    isDefined(options.scheduledAt) && !isNull(options.scheduledAt) ? toDate(options.scheduledAt).getTime() : null
  const debugId = randomIdentifier()
  const query = await queueDatabase
    .queryBuilder()
    .insertInto('Queue')
    .values({
      name,
      payload,
      priority,
      key: jobFields?.key,
      attempt: jobFields?.attempt,
      scheduledAt,
      debugId,
    })
    .returningAll()
    .run()

  if (query.success) {
    if (runtimeConfig.pruvious.debug.logs.queue && definition.logs && logsDatabase) {
      const event = useEvent()
      const path = event.path.split('?')[0]!

      logsDatabase
        .queryBuilder()
        .insertInto('Queue')
        .values({
          jobDebugId: debugId,
          requestDebugId: event.context.pruvious.requestDebugId,
          method: event.method,
          path,
          queryString: event.path.split('?')[1],
          name,
          payload:
            isObject(definition.logs) && definition.logs.exposePayload === false ? anonymizeObject(payload) : payload,
          priority,
          key: jobFields?.key,
          attempt: jobFields?.attempt,
          scheduledAt,
          user: useEvent().context.pruvious?.auth?.user?.id,
        })
        .run()
    }

    if (runtimeConfig.pruvious.debug.verbose) {
      debug(`Job ${colorize('dim', debugId)} (${name}) queued with priority ${priority}`)
    }

    return {
      success: true,
      inputErrors: undefined,
      runtimeError: undefined,
      data: {
        name: query.data[0]!.name as TName,
        payload: (query.data[0]!.payload ?? undefined) as Jobs[TName]['TPayload'],
        priority: query.data[0]!.priority,
        key: query.data[0]!.key,
        scheduledAt: query.data[0]!.scheduledAt,
        createdAt: query.data[0]!.createdAt,
      },
    }
  } else {
    if (runtimeConfig.pruvious.debug.verbose) {
      debug(`Failed to queue job ${colorize('dim', name)}`)

      if (query.inputErrors) {
        JSON.stringify(query.inputErrors, null, 2)
          .split('\n')
          .forEach((line) => debug(`> ${line}`))
      } else if (query.runtimeError) {
        debug(`> ${query.runtimeError}`)
      }
    }

    return {
      success: false,
      inputErrors: query.inputErrors as any,
      runtimeError: query.runtimeError as any,
      data: undefined,
    }
  }
}

/**
 * Retrieves scheduled jobs from the processing queue based on their planned execution time.
 * Results can be filtered by specifying either a single job name or multiple job names.
 */
export async function getQueue<TJobName extends keyof Jobs>(jobName?: TJobName): Promise<QueuedJob<TJobName>[]>
export async function getQueue<TJobName extends keyof Jobs>(jobNames?: TJobName[]): Promise<QueuedJob<TJobName>[]>
export async function getQueue<TJobName extends keyof Jobs>(
  jobNames?: TJobName | TJobName[],
): Promise<QueuedJob<TJobName>[]> {
  const { getQueueDatabase } = await import('#pruvious/server')
  const queueDatabase = getQueueDatabase()
  const queryBuilder = queueDatabase.queryBuilder().selectFrom('Queue')

  if (jobNames) {
    const filterCallbacks: Parameters<typeof queryBuilder.orGroup>[0] = []
    for (const name of toArray(jobNames)) {
      filterCallbacks.push((eb) => eb.where('name', '=', name))
    }
    queryBuilder.orGroup(filterCallbacks)
  }

  const query = await queryBuilder
    .orderBy('scheduledAt', 'asc', 'nullsFirst')
    .orderBy('priority', 'desc')
    .orderBy('createdAt', 'desc')
    .all()

  return query.success ? (query.data.map((job) => omit(job, ['debugId'])) as any) : []
}

/**
 * Retrieves a specific job from the processing queue by its ID.
 * If the job is not found, the function returns `null`.
 */
export async function getJob<TName extends keyof Jobs>(id: number): Promise<QueuedJob<TName> | null> {
  const { getQueueDatabase } = await import('#pruvious/server')
  const queueDatabase = getQueueDatabase()
  const query = await queueDatabase.queryBuilder().selectFrom('Queue').where('id', '=', id).first()
  return query.success && query.data ? (omit(query.data, ['debugId']) as any) : null
}

/**
 * Processes all jobs in the processing queue.
 * If the `jobName` parameter is specified, only jobs with that name are processed.
 *
 * @returns a `Promise` that resolves to an array of `JobResult` objects.
 */
export async function processQueue<TJobName extends keyof Jobs>(jobName?: TJobName): Promise<JobResult<TJobName>[]>
export async function processQueue<TJobName extends keyof Jobs>(jobNames?: TJobName[]): Promise<JobResult<TJobName>[]>
export async function processQueue<TJobName extends keyof Jobs>(
  jobNames?: TJobName | TJobName[],
): Promise<JobResult<TJobName>[]> {
  const results: JobResult<TJobName>[] = []

  while (true) {
    const result = await processNextJob(jobNames as any)
    if (result) {
      results.push(result)
    } else {
      break
    }
  }

  return results
}

/**
 * Initiates the processing of queued jobs.
 * Makes a POST request to `/api/process-queue` to start queue processing.
 *
 * By default, this is executed automatically after each HTTP request via `pruvious.api.middleware`.
 * To switch to manual triggering, set `pruvious.queue.mode` to `manual` in `nuxt.config.ts`.
 */
export async function triggerQueueProcessing(): Promise<{ success: true }> {
  const runtimeConfig = useRuntimeConfig()
  return $fetch<{ success: true }>(runtimeConfig.pruvious.api.basePath + 'process-queue', {
    method: 'POST',
    headers: { Authorization: `Bearer ${runtimeConfig.pruvious.queue.secret}` },
    body: {},
  })
}

/**
 * Processes a specific job from the processing queue by its ID.
 * If the `force` parameter is set to `true`, the job executes immediately without waiting for its scheduled time.
 *
 * @returns a `Promise` that resolves to a `JobResult` object or `null` if the job is not found.
 */
export async function processJob<TName extends keyof Jobs>(
  id: number,
  force = false,
): Promise<JobResult<TName> | null> {
  const { getQueueDatabase } = await import('#pruvious/server')
  const queueDatabase = getQueueDatabase()
  const queryBuilder = queueDatabase.queryBuilder().deleteFrom('Queue').where('id', '=', id)

  if (!force) {
    queryBuilder.orGroup([
      (eb) => eb.where('scheduledAt', '=', null),
      (eb) => eb.where('scheduledAt', '<=', Date.now()),
    ])
  }

  const query = await queryBuilder.returningAll().run()

  if (query.success && query.data[0]) {
    return _processJob(query.data[0], query.data[0].debugId)
  }

  return null
}

/**
 * Processes the next job in the processing queue.
 * If the `name` parameter is specified, only jobs with that name are processed.
 *
 * @returns a `Promise` that resolves to a `JobResult` object or `null` if no jobs are available.
 */
export async function processNextJob<TName extends keyof Jobs>(name?: TName): Promise<JobResult<TName> | null>
export async function processNextJob<TName extends keyof Jobs>(names?: TName[]): Promise<JobResult<TName> | null>
export async function processNextJob<TName extends keyof Jobs>(
  names?: TName | TName[],
): Promise<JobResult<TName> | null> {
  const { getQueueDatabase } = await import('#pruvious/server')
  const queueDatabase = getQueueDatabase()

  while (true) {
    const queryBuilder = queueDatabase
      .queryBuilder()
      .selectFrom('Queue')
      .orGroup([(eb) => eb.where('scheduledAt', '=', null), (eb) => eb.where('scheduledAt', '<=', Date.now())])

    if (names) {
      const filterCallbacks: Parameters<typeof queryBuilder.orGroup>[0] = []
      for (const name of toArray(names)) {
        filterCallbacks.push((eb) => eb.where('name', '=', name))
      }
      queryBuilder.orGroup(filterCallbacks)
    }

    const query = await queryBuilder.orderBy('priority', 'desc').orderBy('createdAt', 'asc').first()

    if (query.success && query.data) {
      const result = await processJob<TName>(query.data.id, true)
      if (result) {
        return result
      }
    } else {
      return null
    }
  }
}

/**
 * Clears all jobs from the processing queue.
 * If the `jobName` parameter is specified, only jobs with that name are removed.
 *
 * @returns a `Promise` that resolves to the number of jobs removed.
 */
export async function clearQueue<TJobName extends keyof Jobs>(jobName?: TJobName): Promise<number>
export async function clearQueue<TJobName extends keyof Jobs>(jobNames?: TJobName[]): Promise<number>
export async function clearQueue<TJobName extends keyof Jobs>(jobNames?: TJobName | TJobName[]): Promise<number> {
  const { getQueueDatabase } = await import('#pruvious/server')
  const queueDatabase = getQueueDatabase()
  const queryBuilder = queueDatabase.queryBuilder().deleteFrom('Queue')

  if (jobNames) {
    const filterCallbacks: Parameters<typeof queryBuilder.orGroup>[0] = []
    for (const name of toArray(jobNames)) {
      filterCallbacks.push((eb) => eb.where('name', '=', name))
    }
    queryBuilder.orGroup(filterCallbacks)
  }

  const query = await queryBuilder.run()
  return query.success ? query.data : 0
}

/**
 * Deletes a specific job from the processing queue by its ID.
 *
 * @returns a `Promise` that resolves to `true` if the job was deleted successfully, otherwise `false`.
 */
export async function deleteJob(id: number): Promise<boolean> {
  const { getQueueDatabase } = await import('#pruvious/server')
  const queueDatabase = getQueueDatabase()
  const query = await queueDatabase.queryBuilder().deleteFrom('Queue').where('id', '=', id).run()
  return query.success ? query.data === 1 : false
}

async function _processJob<TName extends keyof Jobs>(
  job: { id: number } & (typeof queueCollection)['TCastedTypes'],
  debugId: string,
): Promise<JobResult<TName>> {
  const { jobs, getLogsDatabase, resolveContextLanguage, resolveCurrentUser } = await import('#pruvious/server')
  const runtimeConfig = useRuntimeConfig()
  const logsDatabase = getLogsDatabase()
  const definition = jobs[job.name as TName]
  const handler = definition.handler as any
  const retryCount = isNumber(definition.retry)
    ? definition.retry
    : isObject(definition.retry)
      ? definition.retry.count
      : 0
  const retryDelay =
    isObject(definition.retry) && isPositiveInteger(definition.retry.delay) ? definition.retry.delay : 5000
  const details = pick(job, ['name', 'payload', 'priority', 'key', 'scheduledAt', 'createdAt']) as QueuedJob<TName>
  let result: JobResult<TName>

  if (definition) {
    try {
      result = {
        details,
        success: true,
        data: job.payload ? await handler(job.payload) : await handler(),
      }
    } catch (error: any) {
      result = {
        details,
        success: false,
        error: error.message,
      }
    }
  } else {
    result = {
      details,
      success: false,
      error: `Job \`${job.name}\` is not defined`,
    }
  }

  if (runtimeConfig.pruvious.debug.logs.queue && definition.logs && logsDatabase) {
    await logsDatabase
      .queryBuilder()
      .update('Queue')
      .set({
        status: result.success ? 'success' : 'error',
        result: result.success ? safeStringify(result.data) : result.error,
        completedAt: Date.now(),
      })
      .where('jobDebugId', '=', debugId)
      .run()
  }

  if (runtimeConfig.pruvious.debug.verbose) {
    if (result.success) {
      debug(`Job ${colorize('dim', debugId)} (${job.name}) processed successfully`)
    } else {
      debug(`Job ${colorize('dim', debugId)} (${job.name}) encountered an error`)
      debug(`> ${result.error}`)
    }
  }

  if (!result.success && retryCount > 0 && job.attempt <= retryCount) {
    debug(
      `Requeuing job ${colorize('dim', debugId)} (${job.name}) for retry attempt ${job.attempt} out of ${retryCount}`,
    )
    await _queueJob(
      job.name as TName,
      {
        priority: job.priority,
        scheduledAt: retryDelay > 0 ? Date.now() + retryDelay : null,
        ...((job.payload as any) ?? undefined),
      },
      { key: job.key, attempt: job.attempt + 1 },
    )
  }

  return result
}
