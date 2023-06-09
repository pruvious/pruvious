import { isObject } from '@pruvious-test/utils'
import { Block, BlockRecord, Field, FieldGroup } from './types'

/**
 * Walk over blocks from a specified `blockRecords` array recursively.
 */
export function* walkBlocks(
  blockRecords: BlockRecord[],
  blocks: Block[],
  keyPrefix: string = '',
): IterableIterator<{ block: Block; key: string; record: BlockRecord }> {
  if (!Array.isArray(blockRecords)) {
    return
  }

  for (const [i, blockRecord] of blockRecords.entries()) {
    if (!isObject(blockRecord)) {
      continue
    }

    const block = blocks.find((block) => block.name === blockRecord.name)

    if (block) {
      if (
        block.name === 'Preset' &&
        isObject(blockRecord.props) &&
        isObject(blockRecord.props!['preset']) &&
        Array.isArray(blockRecord.props!['preset'].blocks)
      ) {
        yield* walkBlocks(
          blockRecord.props!['preset'].blocks,
          blocks,
          keyPrefix ? `${keyPrefix}.${i}#${block.name}` : `${i}#${block.name}`,
        )
      } else {
        if (block.fields && blockRecord.props) {
          yield {
            block,
            key: keyPrefix ? `${keyPrefix}.${i}#${block.name}` : `${i}#${block.name}`,
            record: blockRecord,
          }
        }

        if (blockRecord.children && isObject(blockRecord.children)) {
          for (const [slot, childBlocks] of Object.entries(blockRecord.children)) {
            yield* walkBlocks(
              childBlocks,
              blocks,
              keyPrefix ? `${keyPrefix}.${i}#${block.name}:${slot}` : `${i}#${block.name}:${slot}`,
            )
          }
        }
      }
    }
  }
}

/**
 * Walk over block fields from a specified `blockRecords` array recursively.
 */
export function* walkBlockFields(
  blockRecords: BlockRecord[],
  blocks: Block[],
  keyPrefix: string = '',
): IterableIterator<{ field: Field; key: string; value: any; records: Record<string, any> }> {
  if (!Array.isArray(blockRecords)) {
    return
  }

  for (const [i, blockRecord] of blockRecords.entries()) {
    if (!isObject(blockRecord)) {
      continue
    }

    const block = blocks.find((block) => block.name === blockRecord.name)

    if (block) {
      if (
        block.name === 'Preset' &&
        isObject(blockRecord.props) &&
        isObject(blockRecord.props!['preset']) &&
        Array.isArray(blockRecord.props!['preset'].blocks)
      ) {
        yield* walkBlockFields(
          blockRecord.props!['preset'].blocks,
          blocks,
          keyPrefix ? `${keyPrefix}.${i}#${block.name}` : `${i}#${block.name}`,
        )
      } else {
        if (block.fields && blockRecord.props) {
          yield* walkFields(
            blockRecord.props,
            block.fields,
            keyPrefix ? `${keyPrefix}.${i}#${block.name}` : `${i}#${block.name}`,
          )
        }

        if (blockRecord.children && isObject(blockRecord.children)) {
          for (const [slot, childBlocks] of Object.entries(blockRecord.children)) {
            yield* walkBlockFields(
              childBlocks,
              blocks,
              keyPrefix ? `${keyPrefix}.${i}#${block.name}:${slot}` : `${i}#${block.name}:${slot}`,
            )
          }
        }
      }
    }
  }
}

/**
 * Walk over fields from a specified `fieldRecords` object recursively.
 */
export function* walkFields(
  fieldRecords: Record<string, any>,
  fields: (Field | FieldGroup)[],
  keyPrefix: string = '',
): IterableIterator<{ field: Field; key: string; value: any; records: Record<string, any> }> {
  if (!isObject(fieldRecords)) {
    return
  }

  for (const field of fields) {
    if (field.type === 'stack') {
      yield* walkFields(fieldRecords, field.fields, keyPrefix)
    } else if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        yield* walkFields(fieldRecords, tab.fields, keyPrefix)
      }
    } else if (field.type === 'repeater') {
      yield {
        field,
        key: keyPrefix ? `${keyPrefix}.${field.name}` : field.name,
        value: fieldRecords[field.name],
        records: fieldRecords,
      }

      if (Array.isArray(fieldRecords[field.name])) {
        for (const [i, subFieldRecords] of fieldRecords[field.name].entries()) {
          yield* walkFields(
            subFieldRecords,
            field.subFields,
            keyPrefix ? `${keyPrefix}.${field.name}.${i}` : `${field.name}.${i}`,
          )
        }
      }
    } else {
      yield {
        field,
        key: keyPrefix ? `${keyPrefix}.${field.name}` : field.name,
        value: fieldRecords[field.name],
        records: fieldRecords,
      }
    }
  }
}

/**
 * Walk over fields recursively.
 */
export function* simpleWalkFields(
  fields: (Field | FieldGroup)[],
  keyPrefix: string = '',
): IterableIterator<{ field: Field; key: string }> {
  for (const field of fields) {
    if (field.type === 'stack') {
      yield* simpleWalkFields(field.fields, keyPrefix)
    } else if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        yield* simpleWalkFields(tab.fields, keyPrefix)
      }
    } else if (field.type === 'repeater') {
      yield { field, key: keyPrefix ? `${keyPrefix}.${field.name}` : field.name }

      if (field.subFields) {
        yield* simpleWalkFields(
          field.subFields,
          keyPrefix ? `${keyPrefix}.${field.name}` : `${field.name}`,
        )
      }
    } else {
      yield { field, key: keyPrefix ? `${keyPrefix}.${field.name}` : field.name }
    }
  }
}
