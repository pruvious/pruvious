import type { QueryBuilderResult } from '@pruvious/orm'

export interface CustomLogOptions {
  /**
   * Specifies the category of the log entry (e.g. `error`, `warning`, `info`, `debug`, etc.).
   * Used for filtering and organizing logs in the dashboard view.
   *
   * @default 'info'
   */
  type?: string

  /**
   * Indicates the importance level of the log entry.
   * Must be a non-negative integer (>= 0).
   * Higher values represent more critical events.
   * Used for log filtering and prioritization.
   *
   * @default 0
   */
  severity?: number

  /**
   * Optional structured data providing additional context.
   * Can include any relevant key-value pairs for debugging or analysis.
   *
   * @default null
   */
  payload?: Record<string, any> | null
}

/**
 * Stores a custom log entry in the logs database.
 * Custom logs can be viewed in the Pruvious dashboard by admins and users with the `read-logs` permission.
 *
 * @returns a `Promise` containing a `QueryBuilderResult` object.
 * @throws an error if the logs database is not connected.
 *
 * @example
 * ```ts
 * import { insertCustomLog } from '#pruvious/server'
 *
 * await insertCustomLog('New user registered', {
 *   type: 'info',
 *   payload: { email: 'foo@bar.baz' },
 * })
 * ```
 */
export async function insertCustomLog(
  message: string,
  options?: CustomLogOptions,
): Promise<QueryBuilderResult<number, Record<string, string>[]>> {
  const { getLogsDatabase } = await import('#pruvious/server')
  const db = getLogsDatabase()
  const event = useEvent()
  const path = event.path.split('?')[0]!

  if (!db?.isConnected()) {
    throw new Error('The logs database is not connected')
  }

  return db
    .queryBuilder()
    .insertInto('Custom')
    .values({
      requestDebugId: event.context.pruvious.requestDebugId,
      method: event.method,
      path,
      queryString: event.path.split('?')[1],
      type: options?.type ?? 'info',
      severity: options?.severity ?? 0,
      message,
      payload: options?.payload ?? null,
      user: event.context.pruvious.auth.user?.id,
    })
    .run()
}
