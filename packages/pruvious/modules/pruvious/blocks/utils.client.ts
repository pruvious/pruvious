import type { GenericSerializableFieldOptions } from '#pruvious/server'
import type { GenericBlock } from './define.server'

export interface SerializableBlock extends Required<Pick<GenericBlock, 'group' | 'tags' | 'ui'>> {
  /**
   * A key-value object of `GenericSerializableFieldOptions` objects representing the structure of the block.
   *
   * - Object keys represent the field names.
   * - Object values are instances of the `GenericSerializableFieldOptions` objects.
   */
  fields: Record<string, GenericSerializableFieldOptions>
}
