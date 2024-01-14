export interface JobDefinition<T extends (...args: any[]) => any | Promise<any>> {
  /**
   * A unique job name.
   *
   * Examples: 'send-email', 'create-pdf', 'clear-cdn-cache', etc.
   */
  name: string

  /**
   * A function executed when the job is processed.
   * It contains the whole job logic and may accept any number of args, return any value, and throw errors.
   */
  callback: T

  /**
   * Controls the processing priority of jobs in the queue.
   * Jobs with higher priority values will be processed first.
   * If priorities are equal, older jobs take precedence.
   *
   * @default 10
   */
  priority?: number

  /**
   * A self-invoking interval in **seconds** that triggers the processing of this job.
   * The `callback` function is invoked without any arguments every `interval` seconds.
   *
   * Setting this parameter to `false` will disable self-invocation.
   *
   * @default false
   */
  interval?: number | false

  /**
   * A function that is executed before the job is processed.
   * It accepts a `context` argument that includes the resolved job `definition` and callback `args`.
   */
  beforeProcess?: (context: JobProcessContext<T>) => any | Promise<any>

  /**
   * A function that is executed after the job is processed.
   * It accepts a `context` argument that includes the resolved job `definition` and callback `args`, `processedAt` and `duration` timestamps.
   * Additionally, it includes a `success` parameter with an optional `response` or `error` depending on the success of the job processing.
   */
  afterProcess?: (context: JobProcessContext<T> & JobAfterProcessContext<T>) => any | Promise<any>
}

export interface JobProcessContext<T extends (...args: any[]) => any | Promise<any>> {
  /**
   * The resolved job definition object.
   */
  definition: ResolvedJobDefinition<T>

  /**
   * An array containing the arguments used in the job callback function during processing.
   */
  args: Parameters<T>
}

export type JobAfterProcessContext<T extends (...args: any[]) => any | Promise<any>> = {
  /**
   * The timestamp (in milliseconds since the Unix epoch) indicating when the job was processed.
   */
  processedAt: number

  /**
   * The duration of job processing in milliseconds.
   */
  duration: number
} & (
  | {
      /**
       * Indicates the success state of the job processing.
       */
      success: true

      /**
       * The returned value of the job callback function.
       */
      response: Awaited<ReturnType<T>>
    }
  | {
      /**
       * Indicates the success state of the job processing.
       */
      success: false

      /**
       * The error encountered during job processing.
       */
      error: any
    }
)

export type ResolvedJobDefinition<T extends (...args: any[]) => any | Promise<any>> = JobDefinition<T> &
  Required<Pick<JobDefinition<T>, 'priority' | 'interval'>>

/**
 * Define a new job.
 */
export function defineJob<T extends (...args: any[]) => any | Promise<any>>(
  definition: JobDefinition<T>,
): ResolvedJobDefinition<T> {
  return {
    name: definition.name,
    callback: definition.callback,
    priority: definition.priority ?? 10,
    interval: definition.interval ?? false,
    beforeProcess: definition.beforeProcess,
    afterProcess: definition.afterProcess,
  }
}
