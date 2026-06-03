import type { CollectionHooks } from '@pruvious/orm'
import { rm } from 'node:fs/promises'
import { isAbsolute, join } from 'pathe'

type BeforeQueryExecutionHook = Required<CollectionHooks>['beforeQueryExecution'][number]
type AfterQueryExecutionHook = Required<CollectionHooks>['afterQueryExecution'][number]

const KEY = '_cleanupFilesOnDeleteIds'

/**
 * Captures the matching row ids before a delete query runs, then removes the on-disk
 * artifacts those rows owned after the DB delete succeeds. Each artifact path is
 * resolved relative to `process.cwd()` unless it is already absolute.
 *
 * Direct deletes only - rows removed indirectly via `ON DELETE CASCADE` from a parent
 * collection do not trigger this hook (the DB never executes a DELETE against this
 * table). Parent collections that own cascading children must run their own cleanup.
 */
export function cleanupFilesOnDelete(
  collectionName: string,
  pathsForId: (id: number) => string[],
): { before: BeforeQueryExecutionHook; after: AfterQueryExecutionHook } {
  return {
    before: async (context) => {
      if (context.operation !== 'delete') {
        return
      }
      const rows = await context.database
        .queryBuilder()
        .selectFrom(collectionName as never)
        .select(['id'] as never)
        .setWhereCondition(context.whereCondition)
        .all()
      context.customData[KEY] = rows.success ? rows.data.map((r) => (r as { id: number }).id) : []
    },
    after: async (context) => {
      if (context.operation !== 'delete') {
        return
      }
      const ids = context.customData[KEY] as number[] | undefined
      if (!ids?.length) {
        return
      }
      for (const id of ids) {
        for (const raw of pathsForId(id)) {
          const path = isAbsolute(raw) ? raw : join(process.cwd(), raw)
          try {
            await rm(path, { recursive: true, force: true })
          } catch {
            // ignore - best-effort cleanup
          }
        }
      }
    },
  }
}
