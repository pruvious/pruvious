export interface DefineJobOptions<TPayload, TResultData> {
  /**
   * The function that will be called when the job is processed.
   * It can be synchronous or asynchronous and may return a serializable result that gets stored in the logs database if `log` is `true`.
   *
   * The handler function can optionally accept a single payload parameter, which is the data passed to the job when it is queued.
   * The payload type must be a serializable key-value object.
   *
   * @example
   * ```ts
   * // server/jobs/send-email.ts
   * import { defineJob } from '#pruvious/server'
   *
   * interface Payload {
   *   to: string | string[]
   *   subject: string
   *   body: string
   * }
   *
   * export default defineJob({
   *   handler: async (payload: Payload) => {
   *     // Validate payload and send email
   *     // ...
   *     // Return a serializable result that gets stored in the logs database
   *     return { success: true }
   *   },
   *   defaultPriority: 20,
   *   log: false,
   * })
   *
   * // server/api/register.post.ts
   * import { parseBody, queueJob } from '#pruvious/server'
   *
   * export default defineEventHandler(async (event) => {
   *   const { email } = await parseBody(event, 'object').then(({ input }) => input)
   *   // ...
   *   await queueJob('send-email', {
   *     to: email,
   *     subject: 'Welcome!',
   *     body: '...',
   *   })
   *   // ...
   * })
   * ```
   */
  handler: [TPayload] extends [never]
    ? () => TResultData | Promise<TResultData>
    : (payload: TPayload) => TResultData | Promise<TResultData>

  /**
   * A numeric value that defines how important this job is compared to others.
   * Higher numbers mean the job will run sooner than jobs with lower numbers.
   * You can change this for individual jobs by setting the `priority` option when calling `queueJob()`.
   * If two jobs have equal priority, they run in the order they were added to the queue.
   *
   * @default 10
   */
  defaultPriority?: number

  /**
   * Controls the retry behavior for failed jobs.
   * When a retry occurs, the failed job is added back to the queue as a new job.
   *
   * - Provide a number to retry the job that many times, with a default delay of 5 seconds between retries.
   * - Provide an object with `count` and `delay` properties to customize the retry behavior.
   * - Set to `false` to completely disable retries (default).
   *
   * @default false
   */
  retry?:
    | {
        /**
         * The number of times to requeue a failed job.
         * Each retry adds the job back to the queue as a new job with its own attempt count.
         */
        count: number

        /**
         * Delay in milliseconds used to calculate the next scheduled execution time.
         * The delay is added to the current time to determine when the requeued job should run.
         * Set to `0` to requeue without scheduling.
         *
         * @default 5000
         */
        delay?: number
      }
    | number
    | false

  /**
   * Controls if job queueing and processing results should be stored in the logs database.
   * When enabled, it captures job details including payload data, results and error information.
   * This only takes effect if `pruvious.debug.logs.queue` is enabled in `nuxt.config.ts`.
   *
   * Accept either a boolean value to toggle logging on/off, or an options object for more granular control over logging behavior.
   *
   * @default true
   */
  logs?:
    | boolean
    | {
        /**
         * Specifies whether actual payload values are visible in log records.
         * If `false`, only the data types of payload properties are stored instead of their values.
         *
         * @default true
         */
        exposePayload?: boolean
      }
}

export type Job<TPayload, TResultData> = Required<DefineJobOptions<TPayload, TResultData>> & {
  /**
   * Represents the type of the payload that will be passed as an argument to the job handler function.
   *
   * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
   */
  TPayload: TPayload

  /**
   * Represents the return type of a job handler function.
   *
   * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
   */
  TResultData: TResultData
}

/**
 * Defines a new job.
 *
 * Use this as the default export in a file within the `server/jobs/` directory.
 * The filename determines the collection name, which should be in kebab-case (e.g. 'send-email.ts', 'generate-invoice.ts', etc.).
 *
 * @see https://pruvious.com/docs/jobs
 *
 * @example
 * ```ts
 * // server/jobs/send-email.ts
 * import { defineJob } from '#pruvious/server'
 *
 * interface Payload {
 *   to: string | string[]
 *   subject: string
 *   body: string
 * }
 *
 * export default defineJob({
 *   handler: async (payload: Payload) => {
 *     // Validate payload and send email
 *     // ...
 *     // Return a serializable result that gets stored in the logs database
 *     return { success: true }
 *   },
 *   defaultPriority: 20,
 *   log: false,
 * })
 *
 * // server/api/register.post.ts
 * import { parseBody, queueJob } from '#pruvious/server'
 *
 * export default defineEventHandler(async (event) => {
 *   const { email } = await parseBody(event, 'object').then(({ input }) => input)
 *   // ...
 *   await queueJob('send-email', {
 *     to: email,
 *     subject: 'Welcome!',
 *     body: '...',
 *   })
 *   // ...
 * })
 * ```
 */
export function defineJob<TPayload extends Record<string, any> = never, TResultData = unknown>(
  options: DefineJobOptions<TPayload, TResultData>,
): Job<TPayload, TResultData> {
  return {
    handler: options.handler,
    defaultPriority: options.defaultPriority ?? 10,
    retry: options.retry ?? false,
    logs: options.logs ?? true,
    TPayload: undefined as any,
    TResultData: undefined as any,
  }
}

/**
 * Defines a new job handler with default options.
 *
 * Use this as the default export in a file within the `server/jobs/` directory.
 * The filename determines the collection name, which should be in kebab-case (e.g. 'send-email.ts', 'generate-invoice.ts', etc.).
 *
 * The job handler function can be synchronous or asynchronous and may return a serializable result that gets stored in the logs database.
 * It can optionally accept a single payload parameter, which is the data passed to the job when it is queued.
 * The payload type must be a serializable key-value object.
 *
 * If you need to specify custom options, such as `defaultPriority`, `retry`, or `log`, use the `defineJob()` function instead.
 *
 * @see https://pruvious.com/docs/jobs
 *
 * @example
 * ```ts
 * // server/jobs/send-email.ts
 * import { defineJob } from '#pruvious/server'
 *
 * interface Payload {
 *   to: string | string[]
 *   subject: string
 *   body: string
 * }
 *
 * export default defineJobHandler(async (payload: Payload) => {
 *   // Validate payload and send email
 *   // ...
 *   // Return a serializable result that gets stored in the logs database
 *   return { success: true }
 * })
 *
 * // server/api/register.post.ts
 * import { parseBody, queueJob } from '#pruvious/server'
 *
 * export default defineEventHandler(async (event) => {
 *   const { email } = await parseBody(event, 'object').then(({ input }) => input)
 *   // ...
 *   await queueJob('send-email', {
 *     to: email,
 *     subject: 'Welcome!',
 *     body: '...',
 *   })
 *   // ...
 * })
 * ```
 */
export function defineJobHandler<TPayload extends Record<string, any> = never, TResultData = unknown>(
  handler: (() => TResultData | Promise<TResultData>) | ((payload: TPayload) => TResultData | Promise<TResultData>),
): Job<TPayload, TResultData> {
  return {
    handler: handler as any,
    defaultPriority: 10,
    retry: false,
    logs: true,
    TPayload: undefined as any,
    TResultData: undefined as any,
  }
}
