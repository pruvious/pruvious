import type { GenericSingleton } from '#pruvious/server'
import type { CollectionHooks, GenericCollection } from '@pruvious/orm'
import { anonymizeObject, isString, PathMatcher, randomIdentifier } from '@pruvious/utils'
import { colorize } from 'consola/utils'
import type { CollectionMeta } from '../collections/define'
import { debug } from './console'

let matcher: PathMatcher

/**
 * Debug hook that monitors and logs collection queries when debug options are active.
 * Applies to all collections when either `pruvious.debug.verbose` or `pruvious.debug.queries` is enabled.
 */
export const beforeQueryExecutionDebugHook: Required<CollectionHooks>['beforeQueryExecution'][number] = ({
  collection,
  cache,
}) => {
  const runtimeConfig = useRuntimeConfig()

  if (
    runtimeConfig.pruvious.debug.verbose ||
    (runtimeConfig.pruvious.debug.logs.queries.enabled && collection?.meta.logs.enabled)
  ) {
    cache.__queryDebugId ||= randomIdentifier()

    if (runtimeConfig.pruvious.debug.verbose) {
      debug(`Executing query ${colorize('dim', cache.__queryDebugId)}`)
    }
  }
}

/**
 * Hook that captures and logs detailed information about query execution.
 * Triggers after database query completion when `pruvious.debug.verbose` or `pruvious.debug.queries` is enabled.
 */
export const afterQueryExecutionDebugHook: Required<CollectionHooks>['afterQueryExecution'][number] = async (
  { collection, collectionName, customData, cache },
  { query, queryExecutionTime, rawResult, result },
) => {
  const runtimeConfig = useRuntimeConfig()
  const meta = collection?.meta as CollectionMeta | undefined
  const event = useEvent()
  const path = event.path.split('?')[0]!

  if (
    runtimeConfig.pruvious.debug.logs.queries.enabled &&
    meta?.logs.enabled &&
    meta.logs.operations[query.operation] &&
    !customData.__skipLogging &&
    (collectionName !== 'Cache' || runtimeConfig.pruvious.cache.driver !== 'mainDatabase') &&
    (collectionName !== 'Queue' || runtimeConfig.pruvious.queue.driver !== 'mainDatabase') &&
    matchRoute(path)
  ) {
    const { getLogsDatabase } = await import('#pruvious/server')
    const logsDatabase = getLogsDatabase()

    if (logsDatabase) {
      const queryLog = logsDatabase
        .queryBuilder()
        .insertInto('Queries')
        .values({
          queryDebugId: cache.__queryDebugId,
          requestDebugId: isString(customData.__requestDebugId)
            ? customData.__requestDebugId
            : event.context.pruvious.requestDebugId,
          method: event.method,
          path,
          queryString: event.path.split('?')[1],
          sql: query.sql,
          params: meta.logs.exposeData ? query.params : anonymizeObject(query.params),
          executionTime: queryExecutionTime,
          rawResult: JSON.stringify(meta.logs.exposeData ? rawResult : anonymizeObject(rawResult)),
          result: meta.logs.exposeData ? result : { ...result, data: anonymizeObject(result.data) },
          operation: query.operation,
          success: result.success,
          user: event.context.pruvious.auth.user?.id,
        })

      event.waitUntil(queryLog.run())
    }
  }

  if (runtimeConfig.pruvious.debug.verbose) {
    if (result.success) {
      debug(
        `Query ${colorize('dim', cache.__queryDebugId)} executed in ${Math.round(queryExecutionTime * 100) / 100}ms`,
      )
    } else {
      debug(`Query ${colorize('dim', cache.__queryDebugId)} failed`)
    }
  }
}

/**
 * Applies debug hooks to a `collection` instance.
 */
export function applyCollectionDebugHooks<T extends GenericCollection>(collection: T): T {
  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      beforeQueryExecution: [...collection.hooks.beforeQueryExecution, beforeQueryExecutionDebugHook],
      afterQueryExecution: [...collection.hooks.afterQueryExecution, afterQueryExecutionDebugHook],
    },
  }
}

/**
 * Applies debug hooks to a `singleton` instance.
 */
export function applySingletonDebugHooks<T extends GenericSingleton>(singleton: T): T {
  if (singleton.logs.enabled) {
    return {
      ...singleton,
      hooks: {
        ...singleton.hooks,
        beforeQueryExecution: [
          ...singleton.hooks.beforeQueryExecution,
          (context, queryDetails) =>
            beforeQueryExecutionDebugHook(
              { ...context, collection: { meta: { logs: singleton.logs } } } as any,
              queryDetails,
            ),
        ],
        afterQueryExecution: [
          ...singleton.hooks.afterQueryExecution,
          (context, queryDetails) =>
            afterQueryExecutionDebugHook(
              { ...context, collection: { meta: { logs: singleton.logs } } } as any,
              queryDetails,
            ),
        ],
      },
    }
  }

  return singleton
}

/**
 * Evaluates if a given `path` matches the glob patterns defined in `debug.logs.queries.include` and `debug.logs.queries.exclude`.
 * Uses caching to store previously matched results for better performance.
 */
function matchRoute(path: string) {
  const runtimeConfig = useRuntimeConfig()
  const { api } = runtimeConfig.pruvious.debug.logs

  if (!matcher) {
    matcher = new PathMatcher({
      include: api.include,
      exclude: api.exclude,
    })
  }

  return matcher.test(path)
}
