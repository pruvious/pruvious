import { useState, type Ref } from '#imports'
import { isUndefined } from '../utils/common'

/**
 * All unique strings in use.
 */
const usePruviousUnique: () => Ref<Record<string, number>> = () => useState('pruvious-unique', () => ({}))

/**
 * Get a unique string for a specified `prefix`.
 *
 * @example
 * ```typescript
 * pruviousUnique('foo') // 'foo'
 * pruviousUnique('foo') // 'foo-1'
 * pruviousUnique('foo') // 'foo-2'
 * pruviousUnique('bar') // 'bar'
 * ```
 */
export function pruviousUnique(prefix: string) {
  const records = usePruviousUnique()

  if (isUndefined(records.value[prefix])) {
    records.value[prefix] = 0
  }

  const uniqueString = records.value[prefix] ? `${prefix}-${records.value[prefix]}` : prefix

  records.value[prefix]++

  return uniqueString
}
