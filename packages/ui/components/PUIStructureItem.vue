<template>
  <PUICard
    class="pui-structure-item"
    :class="{
      'pui-structure-item-dragging': draggable?.item === item,
      'pui-structure-item-collapsed': item.$expanded === false,
    }"
  >
    <div
      v-if="droppable"
      @mouseup="$emit('drop', 'before')"
      class="pui-structure-item-zone-before"
      :class="{ 'pui-structure-item-zone-visible': draggable?.touch }"
    >
      <span>
        <Icon mode="svg" name="tabler:grip-horizontal" />
      </span>
    </div>

    <div v-if="$slots.header" class="pui-structure-item-header">
      <button
        v-if="isDraggable && !disabled"
        @mousedown="handleDrag"
        @touchstart.prevent="onTouchStart()"
        tabindex="-1"
        type="button"
        class="pui-structure-drag-handle pui-raw"
      >
        <Icon mode="svg" name="tabler:grip-vertical" />
      </button>
      <slot :index="index" :item="item" name="header" />
    </div>

    <div v-if="$slots.item && item.$expanded !== false" class="pui-structure-item-inner">
      <slot :index="index" :item="item" name="item" />
    </div>

    <div
      v-if="droppable"
      @mouseup="$emit('drop', 'after')"
      class="pui-structure-item-zone-after"
      :class="{ 'pui-structure-item-zone-visible': draggable?.touch }"
    >
      <span>
        <Icon mode="svg" name="tabler:grip-horizontal" />
      </span>
    </div>
  </PUICard>
</template>

<script lang="ts" setup>
import { clearArray, deselectAll } from '@pruvious/utils'
import { onKeyStroke, useEventListener } from '@vueuse/core'
import { usePUIStructureDraggable } from '../pui/structure'

const props = defineProps({
  /**
   * The value of a structure item.
   */
  item: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },

  /**
   * The 0-based index of the item in the structure.
   */
  index: {
    type: Number,
    required: true,
  },

  /**
   * The unique identifier of the structure.
   */
  structureId: {
    type: String,
    required: true,
  },

  /**
   * Controls whether the items in the structure can be dragged.
   *
   * @default true
   */
  isDraggable: {
    type: Boolean,
    required: true,
  },

  /**
   * Controls whether a draggable item can be dropped before or after this item.
   */
  droppable: {
    type: Boolean,
    required: true,
  },

  /**
   * Controls whether the structure is disabled and read-only.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    required: true,
  },

  /**
   * The duration in milliseconds to trigger dragging on touch devices.
   *
   * @default 500
   */
  touchDuration: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits<{
  draggable: [draggable: { item: Record<string, any>; touch: boolean } | null]
  drop: [position: 'before' | 'after']
}>()

const draggable = usePUIStructureDraggable()
const dragEventListeners: (() => void)[] = []

let touchTimeout: NodeJS.Timeout | undefined = undefined

useEventListener('touchend', () => {
  clearTimeout(touchTimeout)
  if (props.droppable) {
    setTimeout(deselectAll, 50)
  }
})

onUnmounted(() => {
  clearTimeout(touchTimeout)
})

function handleDrag(event: MouseEvent) {
  if (event.button > 0 || !props.isDraggable) {
    return
  }

  const [x, y] = [event.clientX, event.clientY]

  const stopMouseMove = useEventListener(document, 'mousemove', (event) => {
    if (Math.abs(event.clientX - x) > 5 || Math.abs(event.clientY - y) > 5) {
      emit('draggable', { item: props.item as any, touch: false })
      stopMouseMove()
    }
  })

  dragEventListeners.push(
    stopMouseMove,
    useEventListener(window, 'blur', stopDragging),
    useEventListener(document, 'mouseup', stopDragging),
    onKeyStroke('Escape', stopDragging),
  )
}

function stopDragging() {
  emit('draggable', null)
  cleanupAfterDrag()
}

function onTouchStart() {
  if (props.isDraggable) {
    touchTimeout = setTimeout(() => {
      emit('draggable', { item: props.item as any, touch: true })
      clearTimeout(touchTimeout)
    }, props.touchDuration)
  }
}

function cleanupAfterDrag() {
  dragEventListeners.forEach((stop) => stop())
  clearArray(dragEventListeners)
}
</script>

<style>
.pui-structure-item.pui-card {
  position: relative;
  padding: 0.75rem;
}

.pui-structure-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: calc(100% + 1.5rem);
  margin: -0.75rem;
  margin-bottom: 0;
  padding: 0.5rem;
  border-bottom-width: 1px;
}

.pui-structure-item-collapsed .pui-structure-item-header {
  margin-bottom: -0.75rem;
  border-bottom-width: 0;
}

.pui-structure-drag-handle {
  flex-shrink: 0;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2em;
  height: 2em;
  margin: 0 -0.375rem;
  cursor: move;
  color: hsl(var(--pui-foreground));
  outline: none;
}

.pui-structure-item-inner {
  container-type: inline-size;
  transition: var(--pui-transition);
  transition-property: opacity;
}

.pui-structure-item-inner:not(:first-child) {
  margin-top: 0.75rem;
}

.pui-structure-item-dragging .pui-structure-item-inner {
  opacity: 0.36;
  pointer-events: none;
}

.pui-structure-item-zone-before,
.pui-structure-item-zone-after {
  position: absolute;
  z-index: 2;
  right: 0;
  left: 0;
  opacity: 0;
}

.pui-structure-item-zone-before:hover,
.pui-structure-item-zone-after:hover,
.pui-structure-item-zone-visible {
  opacity: 1;
}

.pui-structure-item-zone-before {
  top: calc(-1.25 * var(--pui-gap, 0.75rem) - 1px);
  height: calc(1.5 * var(--pui-gap, 0.75rem));
}

.pui-structure-item-zone-after {
  bottom: calc(-1.25 * var(--pui-gap, 0.75rem) - 1px);
  height: calc(1.5 * var(--pui-gap, 0.75rem));
}

.pui-structure-item-zone-before::after,
.pui-structure-item-zone-after::after {
  content: '';
  position: absolute;
  z-index: 1;
  top: 50%;
  right: 0;
  left: 0;
  height: 0.125rem;
  margin-top: -0.0625rem;
  background: hsl(var(--pui-ring));
  border-radius: 0.125rem;
  pointer-events: none;
}

.pui-structure-item-zone-before span,
.pui-structure-item-zone-after span {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 1.5em;
  height: 1em;
  background-color: hsl(var(--pui-primary));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  color: hsl(var(--pui-primary-foreground));
  transform: translate3d(-50%, -50%, 0);
}
</style>
