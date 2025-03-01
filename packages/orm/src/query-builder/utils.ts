import type { QueryBuilderResult } from '@pruvious/orm'
import { isArray, isNumber, isObject } from '@pruvious/utils'

/**
 * Checks if the `result` data from a query builder is paginated.
 *
 * @example
 * ```ts
 * const first = await selectFrom('Users').first()
 * isPaginatedQueryBuilderResult(first) // false
 *
 * const all = await selectFrom('Users').all()
 * isPaginatedQueryBuilderResult(all) // false
 *
 * const paginated = await selectFrom('Users').paginate(1, 10)
 * isPaginatedQueryBuilderResult(paginated) // true
 * ```
 */
export function isPaginatedQueryBuilderResultData(
  result: QueryBuilderResult<any, Record<string, string> | Record<string, string>[]>,
) {
  return (
    isObject(result.data) &&
    isArray(result.data.records) &&
    result.data.records.every(isObject) &&
    isNumber(result.data.currentPage) &&
    isNumber(result.data.lastPage) &&
    isNumber(result.data.perPage) &&
    isNumber(result.data.total)
  )
}
