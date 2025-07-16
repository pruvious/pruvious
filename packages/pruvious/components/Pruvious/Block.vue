<template>
  <component
    v-bind="dynamicProps"
    :data-block="dataAttrs || preview ? block.$key : undefined"
    :data-field="dataAttrs || preview ? fieldPath : undefined"
    :is="component"
  />
</template>

<script lang="ts" setup>
import { blockComponents, isPreview } from '#pruvious/client'
import type { BlockName, DynamicBlockFieldTypes } from '#pruvious/server'
import { omit } from '@pruvious/utils'

const props = defineProps({
  /**
   * The block to render.
   */
  block: {
    type: Object as PropType<DynamicBlockFieldTypes['Populated'][BlockName]>,
    required: true,
  },

  /**
   * The full field path in dot notation associated with this block.
   * Required for enabling live editing in the Pruvious dashboard.
   *
   * @example
   * ```ts
   * 'blocks.0'
   * 'sidebarBlocks.0'
   * 'products.0.contentBlocks.1'
   * ```
   */
  fieldPath: {
    type: String,
  },

  /**
   * An array containing all parent blocks of this `block` in hierarchical order.
   * The root block is at index 0, with each subsequent index representing the next level down.
   */
  parentBlocks: {
    type: Array as PropType<DynamicBlockFieldTypes['Populated'][BlockName][]>,
    default: () => [],
  },

  /**
   * The index of the block in the list of blocks.
   */
  index: {
    type: Number,
    default: -1,
  },

  /**
   * Controls whether to add data attributes to the block's root element for identification.
   *
   * When true, adds:
   *
   * - `data-field` - Contains the full field path.
   * - `data-block` - Contains the block name.
   *
   * These attributes help identify elements in the DOM.
   *
   * Note: In preview mode, these attributes are always added if a `fieldPath` is provided, regardless of this setting.
   */
  dataAttrs: {
    type: Boolean,
    default: true,
  },
})

const preview = isPreview()
const component = shallowRef<Component | string>()
const dynamicProps = computed(() => ({
  ...omit(props.block, ['$key'] as any),
  _blockName: props.block?.$key,
  _fieldPath: props.fieldPath,
  _parentBlocks: props.parentBlocks,
  _index: props.index,
}))

provide('pruviousParentBlockPath', props.fieldPath)

watch(
  () => props.block.$key,
  (blockName: BlockName) => {
    if (!blockComponents[blockName]) {
      console.warn('Block not found:', blockName)
    }
    component.value = blockComponents[blockName]?.()
  },
  { immediate: true },
)
</script>
