<template>
  <PruviousBlockRectBase
    :deepest="deepest"
    :editable="editable"
    :el="el"
    :focused="focused"
    :highlighted="highlighted"
    :label="blockLabels[name] ?? name"
    :path="path"
  >
    <button
      v-if="parent.length > 1"
      :disabled="index >= parent.length - 1"
      :title="t.__$('pruvious-dashboard', dashboardLanguage, 'Move down')"
      @mousedown="moveDown()"
      tabindex="-1"
      type="button"
    >
      <Icon mode="svg" name="tabler:chevron-down" />
    </button>

    <button
      v-if="parent.length > 1"
      :disabled="index < 1"
      :title="t.__$('pruvious-dashboard', dashboardLanguage, 'Move up')"
      @mousedown="moveUp()"
      tabindex="-1"
      type="button"
    >
      <Icon mode="svg" name="tabler:chevron-up" />
    </button>

    <button
      :title="t.__$('pruvious-dashboard', dashboardLanguage, 'Delete')"
      @mousedown="deleteBlock()"
      tabindex="-1"
      type="button"
    >
      <Icon mode="svg" name="tabler:trash" />
    </button>
  </PruviousBlockRectBase>
</template>

<script lang="ts" setup>
import {
  i18n,
  preloadTranslatableStrings,
  usePruviousPreviewBlockLabels,
  usePruviousPreviewDashboardLanguage,
  usePruviousRoute,
} from '#pruvious/client'
import type { BlockName, SerializableBlock } from '#pruvious/server'
import { castToNumber, getProperty } from '@pruvious/utils'

const props = defineProps({
  /**
   * The block name.
   */
  name: {
    type: String as PropType<BlockName>,
    required: true,
  },

  /**
   * The block options.
   */
  block: {
    type: Object as PropType<SerializableBlock>,
    required: true,
  },

  /**
   * The field path, expressed in dot notation, represents the exact location of the block within the current data structure.
   */
  path: {
    type: String,
    required: true,
  },

  /**
   * The HTML element to which the bounding preview rectangle will be aligned.
   */
  el: {
    type: Object as PropType<HTMLElement>,
    required: true,
  },

  /**
   * Specifies whether the container data can be modified.
   */
  editable: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the block is currently highlighted in the preview.
   */
  highlighted: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the block is currently focused in the preview.
   */
  focused: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether this block is the deepest in the list of preview rectangles.
   */
  deepest: {
    type: Boolean,
    default: false,
  },
})

const t = i18n()
const route = usePruviousRoute()
const blockLabels = usePruviousPreviewBlockLabels()
const dashboardLanguage = usePruviousPreviewDashboardLanguage()
const parent = computed<any[]>(() => getProperty(route.value?.data ?? {}, props.path.split('.').slice(0, -1).join('.')))
const index = computed(() => Number(castToNumber(props.path.split('.').pop()) ?? -1))

await preloadTranslatableStrings('pruvious-dashboard', dashboardLanguage.value as any)

function moveUp() {
  window.parent.postMessage({ name: 'iframe:moveUpBlock', path: props.path }, window.location.origin)
}

function moveDown() {
  window.parent.postMessage({ name: 'iframe:moveDownBlock', path: props.path }, window.location.origin)
}

function deleteBlock() {
  window.parent.postMessage({ name: 'iframe:deleteBlock', path: props.path }, window.location.origin)
}
</script>
