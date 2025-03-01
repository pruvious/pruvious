import { expect, test } from 'vitest'
import { isPaginatedQueryBuilderResultData } from '../../src'

test('is paginated query builder result data', () => {
  const r = (data: any): any => ({ success: true, data, runtimeError: undefined, inputErrors: undefined })
  const d = (records: any): any => ({ records, currentPage: 1, lastPage: 1, perPage: 1, total: 1 })

  expect(isPaginatedQueryBuilderResultData(r(d([])))).toBe(true)
  expect(isPaginatedQueryBuilderResultData(r(d([{}])))).toBe(true)
  expect(isPaginatedQueryBuilderResultData(r(d({})))).toBe(false)
  expect(isPaginatedQueryBuilderResultData(r([]))).toBe(false)
  expect(isPaginatedQueryBuilderResultData(r({}))).toBe(false)
  expect(isPaginatedQueryBuilderResultData(r(d([1])))).toBe(false)
  expect(isPaginatedQueryBuilderResultData({} as any)).toBe(false)
})
