<template>
  <div
    :aria-expanded="model.item.nestable && model.item.children?.length ? model.item.expanded : undefined"
    role="treeitem"
    class="pui-tree-item"
    :class="{
      'pui-tree-item-selected-sibling':
        selectedItemIds[model.item.id] &&
        activeItems[activeIndex - 1] &&
        selectedItemIds[activeItems[activeIndex - 1]!.item.id],
    }"
  >
    <button
      @blur="$emit('highlight', undefined)"
      @click="select"
      @contextmenu.prevent="select"
      @focus="$emit('highlight', model.item)"
      @keydown.down="
        (event) => {
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault()
            $emit('focusNext')
          }
        }
      "
      @keydown.left.stop="
        (event) => {
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault()
            collapse()
          }
        }
      "
      @keydown.right.stop="
        (event) => {
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault()
            expand()
          }
        }
      "
      @keydown.tab="
        (event) => {
          if (!event.ctrlKey && !event.metaKey) {
            if (event.shiftKey) {
              $emit('focusPrevious', event)
            } else {
              $emit('focusNext', event)
            }
          }
        }
      "
      @keydown.up="
        (event) => {
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault()
            $emit('focusPrevious')
          }
        }
      "
      @mousedown="handleDrag"
      @mouseenter="
        () => {
          if (!mousePaused) {
            $emit('highlight', model.item)
          }
        }
      "
      @mouseleave="
        () => {
          if (!mousePaused) {
            $emit('highlight', undefined)
          }
        }
      "
      @mousemove="
        () => {
          if (model.item.id !== highlightedItem?.id) {
            $emit('highlight', model.item)
          }

          if (mousePaused) {
            $emit('update:mousePaused', false)
          }
        }
      "
      @touchstart="onTouchStart()"
      ref="button"
      type="button"
      class="pui-tree-item-button pui-raw"
      :class="{
        'pui-tree-item-button-highlighted': model.item.id === highlightedItem?.id && !isDragging,
        'pui-tree-item-button-selected': selectedItemIds[model.item.id],
      }"
      :style="{
        paddingLeft:
          model.item.nestable && model.item.children?.length
            ? `calc(${model.parents.length} * 1.5em)`
            : `calc(${model.parents.length} * 1.5em + 1em + 0.125rem)`,
      }"
    >
      <span
        v-if="model.item.nestable && model.item.children?.length"
        @click.stop="model.item.expanded ? collapse() : expand()"
        class="pui-tree-item-toggle"
        :class="{ 'pui-tree-item-toggle-expanded': model.item.expanded }"
      >
        <Icon mode="svg" name="tabler:chevron-right" />
      </span>

      <span v-if="$slots.icon" class="pui-tree-item-icon">
        <slot :item="model.item" name="icon" />
      </span>

      <span class="pui-tree-item-label">
        <slot :item="model.item" name="label">{{ model.item.label ?? model.item.id }}</slot>
      </span>
    </button>

    <div
      v-if="isDragging && allowedDropZones.before"
      @mouseenter="canDrop('before') && $emit('update:dropTarget', { item: model.item, zone: 'before' })"
      @mouseleave="$emit('update:dropTarget', null)"
      @mouseup="canDrop('before') && $emit('drop', { item: model.item, zone: 'before' })"
      class="pui-tree-item-zone-before"
      :class="{
        'pui-tree-item-zone-visible':
          (dropTarget?.item.id === model.item.id && dropTarget?.zone === 'before') ||
          (isTouchDragging && canDrop('before')),
        'pui-tree-item-zone-inset': activeIndex === 0,
      }"
      :style="{
        left: `calc(${model.parents.length} * 1.5em + 1em + 0.125rem)`,
      }"
    ></div>

    <div
      v-if="isDragging && model.item.nestable && allowedDropZones.inside"
      @mouseenter="canDrop('inside') && $emit('update:dropTarget', { item: model.item, zone: 'inside' })"
      @mouseleave="$emit('update:dropTarget', null)"
      @mouseup="canDrop('inside') && $emit('drop', { item: model.item, zone: 'inside' })"
      class="pui-tree-item-zone-inside"
      :class="{ 'pui-tree-item-zone-visible': dropTarget?.item.id === model.item.id && dropTarget?.zone === 'inside' }"
    ></div>

    <div
      v-if="
        isDragging &&
        allowedDropZones.after[model.item.id] !== false &&
        (!model.item.nestable || !model.item.expanded || !model.item.children?.length)
      "
      @mouseenter="canDrop('after') && $emit('update:dropTarget', { item: model.item, zone: 'after' })"
      @mouseleave="$emit('update:dropTarget', null)"
      @mouseup="canDrop('after') && $emit('drop', { item: model.item, zone: 'after' })"
      class="pui-tree-item-zone-after"
      :class="{
        'pui-tree-item-zone-visible':
          (dropTarget?.item.id === model.item.id && dropTarget?.zone === 'after') ||
          (isTouchDragging && canDrop('after')),
        'pui-tree-item-zone-inset': activeIndex === activeItems.length - 1,
      }"
      :style="{
        zIndex: 3 + parentAfterDropZones.length,
        left: `calc(${model.parents.length} * 1.5em + 1em + 0.125rem)`,
      }"
    ></div>

    <template v-if="isDragging">
      <template v-for="(zone, i) of parentAfterDropZones">
        <div
          v-if="allowedDropZones.after[zone.item.id] !== false"
          @mouseenter="canDrop('after', zone.item) && $emit('update:dropTarget', { item: zone.item, zone: 'after' })"
          @mouseleave="$emit('update:dropTarget', null)"
          @mouseup="canDrop('after', zone.item) && $emit('drop', { item: zone.item, zone: 'after' })"
          class="pui-tree-item-zone-after"
          :class="{
            'pui-tree-item-zone-visible':
              (dropTarget?.item.id === zone.item.id && dropTarget?.zone === 'after') ||
              (isTouchDragging && canDrop('after', zone.item)),
            'pui-tree-item-zone-inset': activeIndex === activeItems.length - 1,
          }"
          :style="{
            zIndex: 3 + i,
            left: `calc(${zone.level} * 1.5em + 1em + 0.125rem)`,
          }"
        ></div>
      </template>
    </template>
  </div>
</template>

<script generic="T" lang="ts" setup>
import { clearArray, deselectAll, isFunction, uniqueArrayByProp } from '@pruvious/utils'
import { onKeyStroke, useEventListener } from '@vueuse/core'
import { puiIsMac } from '../pui/hotkeys'
import { puiGetChildTreeItems } from '../pui/tree'
import type { PUITreeModel } from './PUITree.vue'

export type PUITreeItemModel<T> = {
  /**
   * A unique value to identify the tree item.
   */
  id: string | number

  /**
   * The source data of the tree item.
   */
  source: T

  /**
   * An optional label to display for the tree item.
   *
   * If not provided, the `id` will be displayed instead.
   */
  label?: string

  /**
   * Specifies whether the tree item can be dragged.
   *
   * If a function is provided, it will be called with the `item` as the only argument.
   * The function should return a boolean indicating whether the `item` can be dragged.
   *
   * @default false
   */
  draggable?: boolean | ((item: PUITreeItemModel<T>) => boolean)

  /**
   * Specifies whether the selected tree items can be dropped on a target.
   *
   * If a function is provided, it will be called with the current `selection`, the `target` item, and the drop `zone` as arguments.
   * The function should return a boolean indicating whether the `selection` can be dropped on the `target` at the specified `zone`.
   *
   * The following checks are performed by default:
   *
   * - Items cannot be dropped in themselves.
   * - Parent items cannot be dropped inside their descendants.
   *
   * @default false
   */
  droppable?:
    | boolean
    | ((selection: PUITreeItemModel<T>[], target: PUITreeItemModel<T>, zone: PUITreeDropTarget<T>['zone']) => boolean)

  /**
   * Specifies whether the tree item can be moved within the same level using keyboard shortcuts.
   *
   * If a function is provided, it will be called with the `item` as the only argument.
   * The function should return a boolean indicating whether the `item` can be moved.
   *
   * @default false
   */
  movable?: boolean | ((item: PUITreeItemModel<T>) => boolean)
} & (
  | {
      /**
       * Specifies whether the tree item can have children.
       */
      nestable: true

      /**
       * The child tree items.
       */
      children?: PUITreeItemModel<T>[]

      /**
       * Indicates whether the tree item is expanded.
       */
      expanded?: boolean
    }
  | {
      /**
       * Specifies whether the tree item can have children.
       */
      nestable: false
    }
)

export interface PUITreeExtendedItemModel<T> {
  /**
   * The tree item model.
   */
  item: PUITreeItemModel<T>

  /**
   * The index of the item in the `parent` or the root tree if `parents` is empty.
   */
  index: number

  /**
   * All parents of the item, starting from the nearest parent.
   */
  parents: PUITreeExtendedParentItemModel<T>[]

  /**
   * All descendants of the item.
   */
  descendants: PUITreeExtendedItemModel<T>[]
}

export interface PUITreeExtendedParentItemModel<T> extends PUITreeExtendedItemModel<T> {
  /**
   * The tree item model.
   */
  item: PUITreeItemModel<T> & { nestable: true }
}

export interface PUITreeDropTarget<T> {
  /**
   * The tree item that is the drop target.
   */
  item: PUITreeItemModel<T>

  /**
   * The drop zone relative to the drop target.
   */
  zone: 'before' | 'inside' | 'after'
}

const props = defineProps({
  /**
   * The extended tree item model.
   */
  model: {
    type: Object as PropType<PUITreeExtendedItemModel<T>>,
    required: true,
  },

  /**
   * The tree model with all the items.
   */
  tree: {
    type: Array as PropType<PUITreeModel<T>>,
    required: true,
  },

  /**
   * The active items in the tree, sorted by their UI appearance.
   */
  activeItems: {
    type: Array as PropType<PUITreeExtendedItemModel<T>[]>,
    required: true,
  },

  /**
   * The index of the tree item in the `activeItems`.
   */
  activeIndex: {
    type: Number,
    required: true,
  },

  /**
   * The highlighted tree item.
   */
  highlightedItem: {
    type: null as unknown as PropType<PUITreeItemModel<T> | undefined>,
  },

  /**
   * The selected tree items.
   */
  selectedItems: {
    type: Array as PropType<PUITreeItemModel<T>[]>,
    default: () => [],
  },

  /**
   * The selected tree items as an object with the item IDs as keys.
   */
  selectedItemIds: {
    type: Object as PropType<Record<string, boolean>>,
    required: true,
  },

  /**
   * The tree item that initiates the selection.
   */
  selectionOrigin: {
    type: null as unknown as PropType<PUITreeItemModel<T> | null>,
    required: true,
  },

  /**
   * Indicates whether the user is dragging items.
   */
  isDragging: {
    type: Boolean,
    required: true,
  },

  /**
   * Indicates whether the user is dragging items on touch devices.
   */
  isTouchDragging: {
    type: Boolean,
    required: true,
  },

  /**
   * The tree item that is the drop target.
   */
  dropTarget: {
    type: null as unknown as PropType<PUITreeDropTarget<T> | null>,
    required: true,
  },

  /**
   * Determines whether mouse events for highlighting are paused.
   */
  mousePaused: {
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
    default: 500,
  },
})

const emit = defineEmits<{
  'highlight': [item: PUITreeItemModel<T> | undefined]
  'select': [items: PUITreeItemModel<T>[]]
  'drop': [target: PUITreeDropTarget<T>]
  'focusPrevious': [event?: Event]
  'focusNext': [event?: Event]
  'update:tree': [tree: PUITreeModel<T>]
  'update:selectionOrigin': [item: PUITreeItemModel<T> | null]
  'update:isDragging': [isDragging: boolean]
  'update:isTouchDragging': [isTouchDragging: boolean]
  'update:dropTarget': [target: PUITreeDropTarget<T> | null]
  'update:mousePaused': [mousePaused: boolean]
}>()

const button = useTemplateRef('button')
const isDraggable = computed(() =>
  isFunction(props.model.item.draggable) ? props.model.item.draggable(props.model.item) : !!props.model.item.draggable,
)
const dragEventListeners: (() => void)[] = []
const allowedDropZones = ref<{ before: boolean; inside: boolean; after: Record<string, false> }>({
  before: true,
  inside: true,
  after: {},
})

let touchTimeout: NodeJS.Timeout | undefined = undefined

/**
 * The parent tree items that can be drop targets after the current item.
 */
const parentAfterDropZones = computed(() => {
  const zones: { item: PUITreeItemModel<T>; level: number }[] = []

  // Show only when the item is the last child of its parent and has no descendants
  if (
    props.model.index === (props.model.parents[0]?.item.children ?? props.tree).length - 1 &&
    !props.model.descendants.length
  ) {
    for (const parent of props.activeItems[props.activeIndex]!.parents) {
      if (parent.index === (parent.parents[0]?.item.children ?? props.tree).length - 1) {
        zones.unshift({ item: parent.item, level: parent.parents.length })
      } else {
        break
      }
    }
  }

  return zones
})

/**
 * Stops dragging on touch devices when the touch ends.
 */
useEventListener('touchend', () => {
  clearTimeout(touchTimeout)
  if (props.isDragging) {
    setTimeout(deselectAll, 50)
  }
})

/**
 * Handles the button focus when the item is highlighted.
 */
watch(
  () => props.highlightedItem,
  (highlightedItem) => {
    if (highlightedItem?.id === props.model.item.id) {
      button.value?.focus()
    }
  },
)

/**
 * Clears stuff after dragging has stopped.
 */
watch(
  () => props.isDragging,
  (isDragging) => {
    if (!isDragging) {
      cleanupAfterDrag()
    }
  },
)

/**
 * Cleans up on unmount.
 */
onUnmounted(() => {
  clearTimeout(touchTimeout)
})

/**
 * Handles the selection of the tree item.
 */
function select(event: MouseEvent | KeyboardEvent) {
  if (event.shiftKey && props.selectionOrigin) {
    const originIndex = props.activeItems.findIndex(({ item }) => item.id === props.selectionOrigin!.id)
    const [start, end] =
      originIndex < props.activeIndex ? [originIndex, props.activeIndex] : [props.activeIndex, originIndex]

    emit(
      'select',
      uniqueArrayByProp(
        [...props.selectedItems, ...props.activeItems.map(({ item }) => item).slice(start, end + 1)],
        'id',
      ),
    )
  } else if (puiIsMac() ? event.metaKey : event.ctrlKey) {
    if (props.selectedItems.some(({ id }) => id === props.model.item.id)) {
      emit(
        'select',
        props.selectedItems.filter(({ id }) => id !== props.model.item.id),
      )
    } else {
      emit('select', [...props.selectedItems, props.model.item])
    }
  } else {
    emit('select', [props.model.item])
  }

  if (!props.selectionOrigin || !event.shiftKey) {
    emit('update:selectionOrigin', props.model.item)
  }
}

/**
 * Shows the child items.
 */
function expand() {
  if (props.model.item.nestable && !props.model.item.expanded) {
    updateTree({ expanded: true })
  }
}

/**
 * Hides the child items.
 */
function collapse() {
  if (props.model.item.nestable && props.model.item.expanded) {
    updateTree({ expanded: false })
  }
}

/**
 * Emits the `update:tree` event with the `updatedProps` for the current tree item.
 */
function updateTree(updatedProps: Partial<PUITreeItemModel<T>>) {
  for (const key in updatedProps) {
    // @ts-expect-error
    props.model.item[key] = updatedProps[key]
  }

  emit('update:tree', props.tree)
}

/**
 * Handles the dragging of the selected tree items.
 */
function handleDrag(event: MouseEvent) {
  if (event.button > 0 || !isDraggable.value || !props.selectedItems.every(({ draggable }) => draggable)) {
    return
  }

  const [x, y] = [event.clientX, event.clientY]

  const stopMouseMove = useEventListener(document, 'mousemove', (event) => {
    if (Math.abs(event.clientX - x) > 5 || Math.abs(event.clientY - y) > 5) {
      emit('update:isDragging', true)
      emit('update:isTouchDragging', false)

      if (!props.selectedItems.some(({ id }) => id === props.model.item.id)) {
        select(event)
      }

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

/**
 * Stops the dragging of the selected tree items.
 */
function stopDragging() {
  emit('update:isDragging', false)
  emit('update:isTouchDragging', false)
  emit('update:dropTarget', null)
  cleanupAfterDrag()
}

/**
 * Starts the dragging of the selected tree items on touch devices.
 */
function onTouchStart() {
  if (isDraggable.value || props.selectedItems.every(({ draggable }) => draggable)) {
    touchTimeout = setTimeout(() => {
      emit('select', [props.model.item])
      emit('update:isDragging', true)
      emit('update:isTouchDragging', true)
      clearTimeout(touchTimeout)
    }, props.touchDuration)
  }
}

/**
 * Removes event listeners and resets the allowed drop zones after the dragging has stopped.
 */
function cleanupAfterDrag() {
  allowedDropZones.value = { before: true, inside: true, after: {} }
  dragEventListeners.forEach((stop) => stop())
  clearArray(dragEventListeners)
}

/**
 * Checks whether the selected tree items can be dropped on (this) `item` in the specified `zone`.
 *
 * The following checks are performed by default:
 *
 * - Items cannot be dropped in themselves.
 * - Parent items cannot be dropped inside their descendants.
 */
function canDrop(zone: PUITreeDropTarget<T>['zone'], item?: PUITreeItemModel<T>) {
  item ??= props.model.item

  if ((isFunction(item.droppable) && item.droppable(props.selectedItems, item, zone)) || item.droppable) {
    // Items cannot be dropped in themselves
    if (zone === 'inside' && props.selectedItems.some(({ id }) => id === item.id)) {
      allowedDropZones.value.inside = false
      return false
    }

    // Parent items cannot be dropped inside their descendants
    if (props.selectedItems.some((sItem) => puiGetChildTreeItems(sItem, props.tree).some(({ id }) => id === item.id))) {
      if (zone === 'after') {
        allowedDropZones.value.after[item.id] = false
      } else {
        allowedDropZones.value[zone] = false
      }

      return false
    }

    return true
  }

  if (zone === 'after') {
    allowedDropZones.value.after[item.id] = false
  } else {
    allowedDropZones.value[zone] = false
  }

  return false
}
</script>

<style>
.pui-tree-item {
  position: relative;
  width: 100%;
  font-size: calc(1rem + var(--pui-size, 0) * 0.125rem);
  line-height: 1.5;
}

.pui-tree-item-selected-sibling::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: calc(-1em - 0.125rem);
  right: 0;
  left: 0;
  height: calc(2em + 0.25rem);
  background-color: hsl(var(--pui-accent));
  pointer-events: none;
}

.pui-tree-item-button {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  width: 100%;
  height: calc(2em + 0.25rem);
  padding-right: 0.5em;
  border-radius: calc(var(--pui-radius) - 0.125rem);
  outline: none;
  cursor: default;
  color: hsl(var(--pui-foreground));
}

.pui-tree-item-button-highlighted {
  outline: 0.125rem solid hsl(var(--pui-ring));
  outline-offset: -0.125rem;
}

.pui-tree-item-button-selected {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-tree-item-toggle {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: calc(1em + 0.25rem);
  height: calc(1em + 0.25rem);
  padding-left: 0.125rem;
  color: hsl(var(--pui-muted-foreground));
}

.pui-tree-item-toggle-expanded svg {
  transform: rotate(90deg);
}

.pui-tree-item-icon {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 1em;
  height: 1em;
  margin-right: 0.5em;
  overflow: hidden;
  color: hsl(var(--pui-muted-foreground));
  font-size: calc(1em + 0.125rem);
}

.pui-tree-item-button-selected .pui-tree-item-icon {
  color: hsl(var(--pui-foreground));
}

.pui-tree-item-label {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-tree-item-zone-before,
.pui-tree-item-zone-inside,
.pui-tree-item-zone-after {
  position: absolute;
  z-index: 2;
  right: 0;
}

.pui-tree-item-zone-before {
  top: -0.5em;
  height: 1em;
}

.pui-tree-item-zone-inside {
  top: 0.5em;
  left: 0;
  height: calc(1em + 0.25rem);
}

.pui-tree-item-zone-inside.pui-tree-item-zone-visible::after {
  content: '';
  position: absolute;
  z-index: 1;
  top: -0.5em;
  right: 0;
  bottom: -0.5em;
  left: 0;
  outline: 0.125rem solid hsl(var(--pui-ring));
  outline-offset: -0.125rem;
  border-radius: calc(var(--pui-radius) - 0.125rem);
  pointer-events: none;
}

.pui-tree-item-zone-after {
  bottom: -0.5em;
  height: 1em;
}

.pui-tree-item-zone-before.pui-tree-item-zone-visible::after,
.pui-tree-item-zone-after.pui-tree-item-zone-visible::after {
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

.pui-tree-item-zone-before.pui-tree-item-zone-inset.pui-tree-item-zone-visible::after {
  margin-top: 0;
}

.pui-tree-item-zone-after.pui-tree-item-zone-inset.pui-tree-item-zone-visible::after {
  margin-top: -0.125rem;
}
</style>
