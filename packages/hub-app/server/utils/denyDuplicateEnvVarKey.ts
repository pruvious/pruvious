import { database } from '#pruvious/server'
import type { CollectionHooks } from '@pruvious/orm'
import { isArray } from '@pruvious/utils'

type BeforeQueryExecutionHook = Required<CollectionHooks>['beforeQueryExecution'][number]
type HookContext = Parameters<BeforeQueryExecutionHook>[0]

type TranslateApi = (domain: 'pruvious-api', handle: string, input?: Record<string, string | number>) => string

/**
 * Rejects two `EnvironmentVariables` rows declaring the same `key` for any shared target.
 * `targets` is a many-to-many junction, so no DB-level uniqueness over `(target, key)` is
 * possible - without this the deploy job picks a non-deterministic value by query order.
 *
 * Bypassed when `customData._ignoreDenyDuplicateEnvVarKey === true`.
 */
export function denyDuplicateEnvVarKey(): BeforeQueryExecutionHook {
  return async (context) => {
    if (context.customData._ignoreDenyDuplicateEnvVarKey === true) {
      return
    }

    const __ = context.__ as unknown as TranslateApi

    if (context.operation === 'insert') {
      const inputs = isArray(context.sanitizedInput) ? context.sanitizedInput : [context.sanitizedInput]
      const seen: { key: string; targets: number[] }[] = []

      for (const raw of inputs) {
        const input = raw as { key?: string; targets?: number[] }
        const key = input.key
        const targets = input.targets ?? []

        if (!key || targets.length === 0) {
          continue
        }

        for (const prior of seen) {
          if (prior.key === key && prior.targets.some((t) => targets.includes(t))) {
            throw new Error(
              __('pruvious-api', 'The key `$key` is declared for the same target by another row in this batch', {
                key,
              }),
            )
          }
        }

        await throwIfConflictInDb(context, key, targets, [])

        seen.push({ key, targets })
      }
    } else if (context.operation === 'update') {
      const existing = await database()
        .queryBuilder()
        .selectFrom('EnvironmentVariables')
        .select(['id', 'key', 'targets'])
        .setWhereCondition(context.whereCondition)
        .all()

      if (!existing.success) {
        return
      }

      const inputPatch = (context.sanitizedInput ?? {}) as { key?: string; targets?: number[] }
      const batchIds = existing.data.map((row) => row.id as number)
      const seen: { key: string; targets: number[]; selfId: number }[] = []

      for (const row of existing.data) {
        const selfId = row.id as number
        const key = inputPatch.key ?? (row.key as string | null)
        const targets = inputPatch.targets ?? (row.targets as number[] | null) ?? []

        if (!key || targets.length === 0) {
          continue
        }

        for (const prior of seen) {
          if (prior.selfId !== selfId && prior.key === key && prior.targets.some((t) => targets.includes(t))) {
            throw new Error(
              __('pruvious-api', 'The key `$key` is declared for the same target by another row in this batch', {
                key,
              }),
            )
          }
        }

        await throwIfConflictInDb(context, key, targets, batchIds)

        seen.push({ key, targets, selfId })
      }
    }
  }
}

async function throwIfConflictInDb(
  context: HookContext,
  key: string,
  targets: number[],
  excludeIds: number[],
): Promise<void> {
  let qb = database()
    .queryBuilder()
    .selectFrom('EnvironmentVariables')
    .select(['id'])
    .where('key', '=', key)
    .where('targets', 'includesAny', targets)

  if (excludeIds.length > 0) {
    qb = qb.where('id', 'notIn', excludeIds)
  }

  const conflict = await qb.first()

  if (conflict.success && conflict.data) {
    const __ = context.__ as unknown as TranslateApi
    throw new Error(
      __('pruvious-api', 'The key `$key` is already defined for one of the selected targets by record #$id', {
        key,
        id: String(conflict.data.id),
      }),
    )
  }
}
