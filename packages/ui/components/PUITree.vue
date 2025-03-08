<template>
  <div
    @click="hasInteracted = true"
    @mouseenter="setPreviouslyFocusedElement()"
    @mouseleave="revertFocus()"
    @mousemove="unpauseMouseDelayed()"
    orientation="vertical"
    ref="root"
    role="tree"
    class="pui-tree"
    :style="{
      '--pui-size': size,
      '--pui-accent': (focused && !isDragging) || isTouchDragging ? undefined : 'var(--pui-secondary)',
      '--pui-accent-foreground':
        (focused && !isDragging) || isTouchDragging ? undefined : 'var(--pui-secondary-foreground)',
    }"
  >
    <PUIScrollable @scrollStep="scrollItems" ref="scrollable">
      <div :style="{ height: `calc(${placeholder.start} * (2em + 0.25rem))` }"></div>

      <template v-for="(activeItem, i) of activeItems">
        <PUITreeItem
          v-if="i >= placeholder.start && i <= placeholder.end"
          v-model:dropTarget="dropTarget"
          v-model:isDragging="isDragging"
          v-model:isTouchDragging="isTouchDragging"
          v-model:mousePaused="mousePaused"
          v-model:selectionOrigin="selectionOrigin"
          :activeIndex="i"
          :activeItems="activeItems"
          :highlightedItem="highlightedItem"
          :isLastDescendant="i === activeItems.length - 1"
          :key="activeItem.item.id"
          :model="activeItem"
          :selectedItemIds="selectedItemIds"
          :selectedItems="selectedItems"
          :touchDuration="touchDuration"
          :tree="modelValue"
          @drop="
            ({ item, zone }) => {
              isDragging = false
              isTouchDragging = false
              dropTarget = null

              if (source) {
                dropItems(puiNormalizeTreeSelection(selectedItems, modelValue), item, zone)
              }

              $emit('dropItems', puiNormalizeTreeSelection(selectedItems, modelValue), item, zone)
            }
          "
          @focusNext="focusNext"
          @focusPrevious="focusPrevious"
          @highlight="$emit('update:highlightedItem', $event)"
          @select="$emit('update:selectedItems', puiSortTreeItems($event, modelValue))"
          @update:tree="$emit('update:modelValue', $event)"
        >
          <template #icon="{ item }">
            <slot :item="item" name="item-icon" />
          </template>

          <template #label="{ item }">
            <slot :item="item" name="item-label" />
          </template>
        </PUITreeItem>
      </template>

      <div :style="{ height: `calc(${activeItems.length - placeholder.end - 1} * (2em + 0.25rem))` }"></div>
    </PUIScrollable>
  </div>
</template>

<script generic="T, SourceIdProp extends string, SourceChildrenProp extends string" lang="ts" setup>
import { deepClone, isDescendant, isUndefined, next, prev, randomIdentifier, remove } from '@pruvious/utils'
import { onClickOutside, useFocusWithin } from '@vueuse/core'
import type { PUITreeDropTarget, PUITreeExtendedItemModel, PUITreeItemModel } from './PUITreeItem.vue'

export type PUITreeModel<T> = PUITreeItemModel<T>[]

export interface PUITreePlaceholder {
  /**
   * Height of a single tree item.
   */
  itemHeight?: number

  /**
   * The lowest index of the visible items that should be rendered.
   */
  start: number

  /**
   * The highest index of the visible items that should be rendered.
   */
  end: number
}

export interface PUITreeSource<Id extends string, Children extends string> {
  root: PUITreeSourceItem<Id, Children>[]
  props: {
    id: Id
    children: Children
  }
}

export type PUITreeSourceItem<Id extends string, Children extends string> = Record<Id, string | number> &
  Partial<Record<Children, PUITreeSourceItem<Id, Children>[]>>

const props = defineProps({
  /**
   * The tree model with all the items.
   */
  modelValue: {
    type: Array as PropType<PUITreeModel<T>>,
    required: true,
  },

  /**
   * The highlighted tree item.
   *
   * This property must be set to enable item highlighting.
   */
  highlightedItem: {
    type: null as unknown as PropType<PUITreeItemModel<T> | undefined>,
  },

  /**
   * The selected tree items.
   *
   * This property must be set to enable item selection.
   */
  selectedItems: {
    type: Array as PropType<PUITreeItemModel<T>[]>,
    default: () => [],
  },

  /**
   * The source from which the tree is built.
   *
   * - The `source.root` must be an array of objects that have the `source.props.id` property.
   * - If the objects are nestable, they must have `source.props.children` property.
   * - The `source.props.children` property must be an array of source objects of the same type.
   *
   * If specified, this component will automatically mutate the source, reflecting the following events in the tree:
   *
   * - `@duplicateItems` - A random string of 23 alphabetic characters is generated for each unique item.
   * - `@moveUpItems`
   * - `@moveDownItems`
   * - `@dropItems`
   * - `@deleteItems`
   * - `@cutItems` - Handles only the deletion.
   */
  source: {
    type: Object as PropType<PUITreeSource<SourceIdProp, SourceChildrenProp>>,
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

  /**
   * Adjusts the size of the component.
   *
   * Examples:
   *
   * - -2 (very small)
   * - -1 (small)
   * - 0 (default size)
   * - 1 (large)
   * - 2 (very large)
   *
   * By default, the value is inherited as the CSS variable `--pui-size` from the parent element.
   */
  size: {
    type: Number,
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: PUITreeModel<T>]
  'update:highlightedItem': [item: PUITreeItemModel<T> | undefined]
  'update:selectedItems': [items: PUITreeItemModel<T>[]]
  'copyItems': [items: PUITreeItemModel<T>[], event: KeyboardEvent]
  'cutItems': [items: PUITreeItemModel<T>[], event: KeyboardEvent]
  'deleteItems': [items: PUITreeItemModel<T>[], event: KeyboardEvent]
  'duplicateItems': [items: PUITreeItemModel<T>[], event: KeyboardEvent]
  'dropItems': [items: PUITreeItemModel<T>[], target: PUITreeItemModel<T>, zone: PUITreeDropTarget<T>['zone']]
  'moveDownItems': [items: PUITreeItemModel<T>[], event: KeyboardEvent]
  'moveUpItems': [items: PUITreeItemModel<T>[], event: KeyboardEvent]
}>()

defineExpose({
  deleteItems,
  dropItems,
  duplicateItems,
  flatItems,
  getActiveItems,
  moveDownItems,
  moveUpItems,
  scrollToItem,
  scrollToSelection,
})

const root = useTemplateRef('root')
const { focused } = useFocusWithin(root)
const previouslyFocusedElement = ref<Element | null>(null)
const hasInteracted = ref(false)
const activeItems = computed(() => getActiveItems(props.modelValue))
const placeholder = ref<PUITreePlaceholder>({ start: 0, end: 0 })
const selectedItemIds = computed(() => Object.fromEntries(props.selectedItems.map((item) => [item.id, true])))
const selectionOrigin: Ref<PUITreeItemModel<T> | null> = ref(null)
const isDragging = ref(false)
const isTouchDragging = ref(false)
const dropTarget: Ref<PUITreeDropTarget<T> | null> = ref(null)
const scrollable = useTemplateRef('scrollable')
const mousePaused = ref(false)
const { listen } = usePUIHotkeys()
const stop: (() => void)[] = []

/**
 * Timeout to unpause mouse events after a delay following mouse movement.
 */
let unpauseMouseTimeout: ReturnType<typeof setInterval> | undefined

/**
 * Timeout to unset the placeholder `itemHeight` property.
 */
let unsetPlaceholderItemHeightTimeout: ReturnType<typeof setTimeout> | undefined

/**
 * On tree item changes:
 *
 * - Unsets the highlighted and selected items.
 * - Temporary locks the scrollable area.
 * - Refreshes the scrollable element measurements.
 */
watch(
  () => props.modelValue,
  () => {
    const flattened = flatItems()

    if (props.highlightedItem && !flattened.find((item) => item.id === props.highlightedItem?.id)) {
      emit('update:highlightedItem', undefined)
    }

    if (props.selectedItems.length) {
      emit(
        'update:selectedItems',
        flattened.filter((item) => selectedItemIds.value[item.id]),
      )
    }

    scrollable.value!.isLocked = true
    nextTick(scrollable.value!.scroll.measure)
    setTimeout(() => (scrollable.value!.isLocked = false))
  },
  { deep: true },
)

/**
 * Listens for keyboard events to handle tree item actions.
 */
watch(
  [() => props.selectedItems, focused],
  ([items, isFocused]) => {
    stop.forEach((s) => s())

    if (items.length && isFocused) {
      stop.push(
        listen('copy', (event) => {
          emit('copyItems', puiNormalizeTreeSelection(items, props.modelValue), event)
        }),
      )

      stop.push(
        listen('duplicate', (event) => {
          if (props.source) {
            duplicateItems(puiNormalizeTreeSelection(items, props.modelValue), event)
          }

          emit('duplicateItems', puiNormalizeTreeSelection(items, props.modelValue), event)
        }),
      )

      stop.push(
        listen('cut', (event) => {
          const normalizedSelection = puiNormalizeTreeSelection(items, props.modelValue)

          if (props.source) {
            deleteItems(normalizedSelection, event)
          }

          emit('cutItems', normalizedSelection, event)
          emit('update:selectedItems', [])
        }),
      )

      stop.push(
        listen('delete', (event) => {
          const normalizedSelection = puiNormalizeTreeSelection(items, props.modelValue)

          if (props.source) {
            deleteItems(normalizedSelection, event)
          }

          emit('deleteItems', normalizedSelection, event)
          emit('update:selectedItems', [])
        }),
      )

      stop.push(
        listen('moveUp', (event) => {
          const normalizedSelection = puiNormalizeTreeSelection(items, props.modelValue)

          if (props.source) {
            moveUpItems(normalizedSelection, event)
          }

          emit('moveUpItems', normalizedSelection, event)

          setTimeout(() => {
            root.value?.querySelector('button')?.focus()
            emit('update:selectedItems', puiSortTreeItems(props.selectedItems, props.modelValue))

            if (event instanceof KeyboardEvent) {
              emit('update:highlightedItem', undefined)
            }
          })
        }),
      )

      stop.push(
        listen('moveDown', (event) => {
          const normalizedSelection = puiNormalizeTreeSelection(items, props.modelValue)

          if (props.source) {
            moveDownItems(normalizedSelection, event)
          }

          emit('moveDownItems', normalizedSelection, event)

          setTimeout(() => {
            root.value?.querySelector('button')?.focus()
            emit('update:selectedItems', puiSortTreeItems(props.selectedItems, props.modelValue))

            if (event instanceof KeyboardEvent) {
              emit('update:highlightedItem', undefined)
            }
          })
        }),
      )
    }
  },
  { immediate: true },
)

/**
 * Updates the placeholder properties when the tree is scrolled.
 */
onMounted(() => {
  watch(
    scrollable.value!.scroll.y,
    (y) => {
      clearTimeout(unsetPlaceholderItemHeightTimeout)
      unsetPlaceholderItemHeightTimeout = setTimeout(() => (placeholder.value.itemHeight = undefined), 1000)

      if (isUndefined(placeholder.value.itemHeight)) {
        placeholder.value.itemHeight = calcItemSizes().itemHeight
      }

      placeholder.value.start = Math.floor(y / placeholder.value.itemHeight)
      placeholder.value.end = Math.ceil((y + scrollable.value!.$el.offsetHeight) / placeholder.value.itemHeight)
    },
    { immediate: true },
  )
})

/**
 * Stops dragging when clicking outside the tree.
 */
onClickOutside(root, () => {
  isDragging.value = false
  isTouchDragging.value = false
})

/**
 * Clears timeouts when the component is unmounted.
 */
onUnmounted(() => {
  clearTimeout(unsetPlaceholderItemHeightTimeout)
  clearTimeout(unpauseMouseTimeout)
})

/**
 * Returns the flat list of all choices in the tree.
 */
function flatItems() {
  return puiFlatTreeItems(props.modelValue)
}

/**
 * Focuses the previous tree item.
 */
function focusPrevious(event?: Event) {
  if (props.highlightedItem && !isDragging.value) {
    const item = prev(
      props.highlightedItem,
      activeItems.value.map(({ item }) => item),
      { prop: 'id' },
    )

    if (item?.id !== props.highlightedItem.id) {
      emit('update:highlightedItem', item)
      mousePaused.value = true
      nextTick(scrollToHighlighted)
      event?.preventDefault()
    }
  }
}

/**
 * Focuses the next tree item.
 */
function focusNext(event?: Event) {
  if (props.highlightedItem && !isDragging.value) {
    const item = next(
      props.highlightedItem,
      activeItems.value.map(({ item }) => item),
      { prop: 'id' },
    )

    if (item?.id !== props.highlightedItem.id) {
      emit('update:highlightedItem', item)
      mousePaused.value = true
      nextTick(scrollToHighlighted)
      event?.preventDefault()
    }
  }
}

/**
 * Scrolls to the highlighted tree item.
 */
function scrollToHighlighted() {
  if (props.highlightedItem) {
    scrollToItem(props.highlightedItem)
  }
}

/**
 * Scrolls to the selected tree items.
 */
function scrollToSelection() {
  if (props.selectedItems.length) {
    scrollToItem(props.selectedItems[0]!)
  }
}

/**
 * Scrolls to the specified `item` in the tree.
 */
function scrollToItem(item: PUITreeItemModel<T>) {
  const { em, itemHeight } = calcItemSizes()

  let offset = 0
  let found = false

  for (const i of activeItems.value.map(({ item }) => item)) {
    if (i.id === item.id) {
      found = true
      break
    } else {
      offset++
    }
  }

  let top = found ? itemHeight * offset : 0

  // Reduce the top offset by the height of the top button
  if (top > 0 && (!scrollable.value?.scroll.arrivedState.top || !scrollable.value?.scroll.arrivedState.bottom)) {
    top -= em
  }

  scrollable.value?.$el.scrollTo({ top, behavior: 'instant' })
}

/**
 * Scrolls the items in the specified `direction`.
 * The scroll increment is equal to the height of a single tree item.
 */
function scrollItems(direction: 'up' | 'down') {
  if (!mousePaused.value) {
    const { itemHeight } = calcItemSizes()
    const scrollTop = scrollable.value?.$el.scrollTop ?? 0

    scrollable.value?.$el.scrollTo({
      top: scrollTop + (direction === 'up' ? -itemHeight : itemHeight),
      behavior: 'instant',
    })
  }
}

/**
 * Retrieves the currently active items in the tree, sorted by their UI appearance.
 */
function getActiveItems(tree: PUITreeModel<T>, parents: PUITreeExtendedItemModel<T>[] = [], level = 0) {
  const items: PUITreeExtendedItemModel<T>[] = []

  for (const [index, item] of (tree ?? props.modelValue).entries()) {
    const current = { item, index, parents, descendants: [] } as PUITreeExtendedItemModel<T>
    const prevLength = items.length

    items.push(current)

    if (item.nestable && item.expanded && item.children?.length) {
      items.push(...getActiveItems(item.children, [current, ...parents], level + 1))
    }

    current.descendants = items.slice(prevLength + 1)
  }

  return items
}

/**
 * Duplicates the selected tree `items`.
 * The duplicated items are inserted before the original items and automatically selected after duplication.
 *
 * If the `source` prop is set, the source items are also duplicated.
 */
function duplicateItems(items: PUITreeItemModel<T>[], event: Event) {
  event.preventDefault()

  const addedItems: PUITreeItemModel<T>[] = []

  for (const item of items) {
    const treeItemClone = cloneItem(item)
    const added = puiAddTreeItemsBefore([treeItemClone], item, props.modelValue)

    addedItems.push(treeItemClone)

    if (props.source) {
      const source = added[0]!.parent?.source as any
      const slot = source?.[props.source.props.children] ?? props.source.root

      slot.splice(added[0]!.index, 0, treeItemClone.source)
    }
  }

  emit('update:selectedItems', addedItems)

  if (selectionOrigin.value) {
    const index = items.findIndex(({ id }) => id === selectionOrigin.value!.id)

    if (index > -1) {
      selectionOrigin.value = addedItems[index]!
    }
  }

  setTimeout(() => {
    root.value?.querySelector('button')?.focus()

    if (event instanceof KeyboardEvent) {
      emit('update:highlightedItem', undefined)
    }
  })
}

/**
 * Deletes the selected tree `items`.
 *
 * If the `source` prop is set, the source items are also removed.
 */
function deleteItems(items: PUITreeItemModel<T>[], event: Event) {
  event.preventDefault()

  const deleted = puiDeleteTreeItems(items, props.modelValue)

  if (props.source) {
    for (const { item, parent } of deleted) {
      remove(
        item.source,
        parent?.source[props.source.props.children as unknown as keyof T] ?? (props.source.root as any),
        true,
      )
    }
  }
}

/**
 * Moves the selected tree `items` up in the tree.
 *
 * If the `source` prop is set, the source items are also moved.
 */
function moveUpItems(items: PUITreeItemModel<T>[], event: Event) {
  event.preventDefault()

  const moved = puiMoveTreeItems(items, props.modelValue, 'up')

  if (props.source) {
    for (const { item, parent, oldIndex, newIndex } of moved) {
      if (oldIndex !== newIndex) {
        const slot = (parent?.source[props.source.props.children as unknown as keyof T] ?? props.source.root) as any[]
        slot.splice(oldIndex, 1)
        slot.splice(newIndex, 0, item.source)
      }
    }
  }
}

/**
 * Moves the selected tree `items` down in the tree.
 *
 * Note: The `source` prop must be set for this method to work.
 */
function moveDownItems(items: PUITreeItemModel<T>[], event: Event) {
  event.preventDefault()

  const moved = puiMoveTreeItems(items, props.modelValue, 'down')

  if (props.source) {
    for (const { item, parent, oldIndex, newIndex } of moved) {
      if (oldIndex !== newIndex) {
        const slot = (parent?.source[props.source.props.children as unknown as keyof T] ?? props.source.root) as any[]
        slot.splice(oldIndex, 1)
        slot.splice(newIndex, 0, item.source)
      }
    }
  }
}

/**
 * Drops the specified `items` into the `target` tree item.
 *
 * If the `source` prop is set, the source items are also moved.
 */
function dropItems(items: PUITreeItemModel<T>[], target: PUITreeItemModel<T>, zone: PUITreeDropTarget<T>['zone']) {
  const dropped = puiDropTreeItems(items, target, props.modelValue, zone)

  if (props.source) {
    for (const { oldIndex, oldParent } of dropped) {
      const slot = (oldParent?.source[props.source.props.children as unknown as keyof T] ?? props.source.root) as any[]
      slot.splice(oldIndex, 1)
    }

    for (const { item, newIndex, newParent } of dropped) {
      const slot = (newParent?.source[props.source.props.children as unknown as keyof T] ?? props.source.root) as any[]
      slot.splice(newIndex, 0, item.source)
    }
  }
}

/**
 * Clones a tree item and its source item, including all child items.
 * It also generates new random identifiers for the cloned items.
 *
 * @returns the cloned tree item.
 */
function cloneItem(item: PUITreeItemModel<T>) {
  const clone = deepClone(item)
  randomizeIds(clone)
  return clone
}

/**
 * Recursively generates new random identifiers for the specified `item` and its children.
 * If the `source` prop is specified, the `id` property in the source item is also updated.
 */
function randomizeIds(item: PUITreeItemModel<T>) {
  item.id = randomIdentifier()

  if (props.source) {
    item.source[props.source.props.id as unknown as keyof T] = item.id as any
  }

  if (item.nestable && item.children?.length) {
    for (const child of item.children) {
      randomizeIds(child)
    }
  }
}

/**
 * Calculates the base font size, em unit, and the height of an item in the tree.
 *
 * @returns the calculated sizes in pixels.
 */
function calcItemSizes() {
  const baseFontSize = +getComputedStyle(document.documentElement).getPropertyValue('font-size').slice(0, -2)
  const sizeVar = root.value ? getComputedStyle(root.value).getPropertyValue('--pui-size') : undefined
  const size = sizeVar ? +sizeVar : 0
  const em = baseFontSize + size * 0.125 * baseFontSize
  const itemHeight = 2 * em + 0.25 * baseFontSize

  return { baseFontSize, em, itemHeight }
}

/**
 * Resumes mouse event handling after a 150ms delay following mouse movement.
 */
function unpauseMouseDelayed() {
  if (mousePaused.value && !unpauseMouseTimeout) {
    unpauseMouseTimeout = setTimeout(() => {
      mousePaused.value = false
      unpauseMouseTimeout = undefined
    }, 150)
  }
}

/**
 * Sets the previously focused element to the current active element.
 */
function setPreviouslyFocusedElement() {
  previouslyFocusedElement.value = document.activeElement
  hasInteracted.value = false
}

/**
 * Reverts the focus to the previously focused element.
 */
function revertFocus() {
  if (!hasInteracted.value && previouslyFocusedElement.value instanceof HTMLElement) {
    if (isDescendant(previouslyFocusedElement.value, root.value!)) {
      previouslyFocusedElement.value.focus()
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement?.blur()
    }

    previouslyFocusedElement.value.focus()
  }
}
</script>

<style>
.pui-tree {
  --pui-background: var(--pui-card);
  --pui-foreground: var(--pui-card-foreground);
  width: 100%;
  padding: 0.125rem;
  background-color: hsl(var(--pui-background));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}
</style>
