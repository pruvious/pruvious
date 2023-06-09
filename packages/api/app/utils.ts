import { Block, BlockRecord, Field, walkBlocks } from '@pruvious-test/shared'
import { Pruvious } from '@pruvious-test/types'
import { blocks } from './imports'

/**
 * Walk over block `records` recursively.
 */
export function* walkBlockRecords(records: BlockRecord[]): IterableIterator<{
  block: Block
  record: BlockRecord
  fields: { field: Field; value: any }[]
}> {
  for (const { block, record } of walkBlocks(records, blocks)) {
    yield {
      block,
      record,
      fields: block.fields.map((field) => ({
        field,
        value: record.props ? record.props[field.name] : undefined,
      })),
    }
  }
}

/**
 * Get block settings by a specified block `name`.
 */
export function getBlock<BlockName extends keyof Pruvious.Block = Pruvious.BlockName>(
  name: BlockName,
): Pruvious.Block[BlockName] {
  return (blocks.find((block) => block.name === name) as any) ?? null
}

/**
 * Get a block record by its `id`.
 */
export function getBlockRecord(id: string, records: BlockRecord[]): BlockRecord | null {
  for (const { record } of walkBlockRecords(records)) {
    if (record.id === id) {
      return record
    }
  }

  return null
}
