<template>
  <PruviousBlock
    v-for="(block, i) of resolvedBlocks"
    :block="block"
    :dataAttrs="dataAttrs"
    :fieldPath="field ? `${blocksFieldPath}.${i}` : undefined"
    :index="i"
    :parentBlocks="parentBlocks"
  />
</template>

<script lang="ts" setup>
import { usePruviousRoute } from '#pruvious/client'
import type { BlockName, DynamicBlockFieldTypes } from '#pruvious/server'
import { getProperty } from '@pruvious/utils'

const props = defineProps({
  /**
   * The blocks to render.
   *
   * This should only be provided if `field` is not set.
   * Using this prop will disable live editing in the Pruvious dashboard.
   */
  blocks: {
    type: Array as PropType<DynamicBlockFieldTypes['Populated'][BlockName][]>,
  },

  /**
   * The name of this `blocks` field.
   * Can be a relative path using dot notation, starting from the closest parent block, collection, or singleton.
   * Required for enabling live editing in the Pruvious dashboard.
   *
   * When using this prop, you don't need to provide the `blocks` prop as the blocks value will be
   * automatically resolved from the current route data.
   *
   * @example
   * ```ts
   * 'blocks'
   * 'sidebarBlocks'
   * 'products.0.contentBlocks'
   * ```
   */
  field: {
    type: String,
  },

  /**
   * An array containing all parent blocks of this `block` in hierarchical order.
   * The root block is at index 0, with each subsequent index representing the next level down.
   *
   * If `field` is provided, this prop will be automatically resolved from the current route data.
   */
  parentBlocks: {
    type: Array as PropType<DynamicBlockFieldTypes['Populated'][BlockName][]>,
  },

  /**
   * Controls whether to add data attributes to all `blocks` for identification.
   *
   * When true, adds:
   *
   * - `data-field` - Contains the full field path.
   * - `data-block` - Contains the block name.
   *
   * These attributes help identify elements in the DOM.
   *
   * Note: In preview mode, these attributes are always added if a `field` is provided, regardless of this setting.
   */
  dataAttrs: {
    type: Boolean,
    default: true,
  },
})

const proute = usePruviousRoute()
const parentBlockPath = inject<string | undefined>('pruviousParentBlockPath', undefined)
const blocksFieldPath = computed(() => (parentBlockPath ? `${parentBlockPath}.${props.field}` : props.field))
const resolvedBlocks = computed(
  () => props.blocks ?? (props.field ? getProperty(proute.value?.data ?? {}, blocksFieldPath.value!) : undefined),
)
</script>
