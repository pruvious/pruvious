import type { CastedFieldType, MultiCollectionName } from '#pruvious'
import type { QueryBuilderInstance } from '../utility-types'

/**
 * Fetch a subset of records from a multi-entry collection based on the provided query and operation.
 * The original query remains unaltered, and the field values of the returned records are not populated.
 * Optionally, you can provide `cache` data to optimize retrieval within collection and field guards.
 */
export async function fetchSubsetRecords<CollectionName extends MultiCollectionName>(
  query: QueryBuilderInstance<CollectionName>,
  operation: 'create' | 'read' | 'update' | 'delete',
  cache?: { data: Record<string, any>; key: string },
): Promise<CastedFieldType[CollectionName][]> {
  if (cache?.data[cache.key]) {
    return cache.data[cache.key]
  }

  const clone = (query as any).clone().selectAll().clearGroup().unpopulate()

  if (operation === 'create') {
    clone.clearWhere()
  }

  if (operation !== 'read') {
    clone.clearOffset().clearLimit()
  }

  const records = await clone.all()

  if (cache) {
    cache.data[cache.key] = records
  }

  return records as any[]
}
