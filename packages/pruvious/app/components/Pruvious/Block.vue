<template>
  <component
    v-bind="dynamicProps"
    :data-block-name="dataAttrs || preview ? block.$key : undefined"
    :data-block-name-alias="aliasName"
    :data-block-path="dataAttrs || preview ? fieldPath : undefined"
    :data-block-path-alias="aliasPath"
    :is="component"
  />
</template>

<script lang="ts" setup>
import {
  blockComponents,
  blockDataInjection,
  blockNameInjection,
  blockPathInjection,
  isPreview,
  linkedBlocksRootInjection,
} from '#pruvious/app'
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
   * Required for live editing from the Pruvious dashboard.
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
   * - `data-block-name` - Contains the block name.
   * - `data-block-path` - Contains the full path to the block in dot notation.
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
const linkedBlocksRoot = inject(linkedBlocksRootInjection, undefined)
const aliasPath = computed(() =>
  (props.dataAttrs || preview) && linkedBlocksRoot?.value?.path ? linkedBlocksRoot.value.path : undefined,
)
const aliasName = computed(() =>
  (props.dataAttrs || preview) && linkedBlocksRoot?.value?.name ? linkedBlocksRoot.value.name : undefined,
)
const dynamicProps = computed(() => ({
  ...omit(props.block, ['$key'] as any),
  _blockName: props.block?.$key,
  _fieldPath: props.fieldPath,
  _parentBlocks: props.parentBlocks,
  _index: props.index,
}))

provide(
  blockDataInjection,
  computed(() => props.block),
)
provide(
  blockNameInjection,
  computed(() => props.block.$key),
)
provide(
  blockPathInjection,
  computed(() => props.fieldPath),
)

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
