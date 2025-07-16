<template>
  <div
    class="p-field-rect"
    :class="{
      'p-field-rect-highlighted': highlighted,
      'p-field-rect-focused': focused,
      'p-field-rect-deepest': deepest,
    }"
    :style="{ top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px` }"
  >
    <div
      v-if="deepest && (!focused || !hasHighlightedDescendant) && width > 100 && height > 24"
      class="p-field-rect-inner"
    >
      <slot v-if="editable" />
      <span v-if="label" class="p-field-rect-label">
        <span>{{ label }}</span>
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  usePruviousPreviewFocusedBlocks,
  usePruviousPreviewHighlightedBlocks,
  usePruviousRoute,
} from '#pruvious/client'
import { useElementBounding } from '@vueuse/core'

const props = defineProps({
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
   * Indicates whether this block is the deepest in the list of field rectangles.
   */
  deepest: {
    type: Boolean,
    default: false,
  },

  /**
   * The label to display within the rectangle.
   */
  label: {
    type: String,
  },
})

const proute = usePruviousRoute()
const { top, left, width, height, update } = useElementBounding(() => props.el)
const focused = usePruviousPreviewFocusedBlocks()
const highlighted = usePruviousPreviewHighlightedBlocks()
const hasHighlightedDescendant = computed(
  () => props.focused && highlighted.value.some((h) => h.path.startsWith(`${props.path}.`)),
)

watch(proute, () => setTimeout(update))
</script>

<style scoped>
.p-field-rect {
  position: fixed;
  z-index: 999998;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  overflow: hidden;
  border: 1px dashed var(--pui-preview, #4c7be5);
  box-sizing: border-box;
  pointer-events: none;
}

.p-field-rect-focused.p-field-rect-deepest {
  border-style: solid;
}

.p-field-rect-inner {
  display: flex;
  gap: 0.0625rem;
  max-width: 100%;
  margin: 0.0625rem;
  overflow: hidden;
  pointer-events: auto;
}

.p-field-rect-inner :deep(button) {
  display: flex;
  justify-items: center;
  align-items: center;
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background-color: var(--pui-preview, #4c7be5);
  border: none;
  outline: none;
  color: var(--pui-preview-foreground, #ffffff);
  font-size: 0.875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: none;
}

.p-field-rect-inner :deep(button:hover, button:focus) {
  background-color: var(--pui-preview-hover, #3a6bbf);
  color: var(--pui-preview-foreground-hover, #ffffff);
}

.p-field-rect-inner :deep(button:disabled) {
  pointer-events: none;
  background-color: var(--pui-preview-disabled, #8dabef);
  color: var(--pui-preview-foreground-disabled, #ffffff);
}

.p-field-rect-inner :deep(button > svg) {
  margin: auto;
}

.p-field-rect-label {
  display: flex;
  align-items: center;
  height: 1.125rem;
  padding: 0 0.375rem;
  overflow: hidden;
  font-family: var(--pui-font-family, Arial, sans-serif);
  font-size: 0.75rem;
  line-height: 1rem;
  background-color: var(--pui-preview, #4c7be5);
  color: var(--pui-preview-foreground, #ffffff);
}

.p-field-rect-label span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
