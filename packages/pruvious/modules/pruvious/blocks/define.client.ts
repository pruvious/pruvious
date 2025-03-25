import type { Block, DefineBlockOptions } from '#pruvious/server'
import type { GenericField } from '@pruvious/orm'

/**
 * Defines additional block options.
 *
 * Use this in `<script setup>` of a Vue component located in the `app/blocks/` directory.
 * The filename determines the block name, which should be in PascalCase (e.g. 'Button.ts', 'TwoColumns.ts', etc.).
 *
 * Fields defined here will be merged with the fields defined in `defineProps` in the Vue component.
 *
 * Note: This function is a compiler macro and does not return any value.
 *
 * @see https://pruvious.com/docs/blocks
 *
 * @example
 * ```vue
 * <template>
 *   <button>{{ label }}</button>
 * </template>
 *
 * <script lang="ts" setup>
 * import { defineBlock, textField } from '#pruvious/client'
 *
 * defineBlock({
 *   ui: {
 *     icon: 'click',
 *   },
 * })
 *
 * defineProps({
 *   label: textField({}),
 * })
 * </script>
 * ```
 */
export function defineBlock<const TFields extends Record<string, GenericField>>(
  options: DefineBlockOptions<TFields>,
): Block<TFields> {
  return undefined as any
}
