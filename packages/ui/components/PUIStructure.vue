<template>
  <div
    class="pui-structure"
    :class="{
      'pui-structure-empty': !modelValue.length,
      'pui-structure-dropzone': !modelValue.length && droppable && !disabled,
    }"
    :style="{ '--pui-size': size }"
  >
    <div v-if="modelValue.length || (droppable && !disabled)" ref="container">
      <div v-if="modelValue.length" class="pui-structure-items">
        <template v-for="(item, i) of modelValue" :key="item.$key ?? i">
          <slot :index="i" :item="item" name="itemBefore" />

          <PUIStructureItem
            :disabled="disabled"
            :droppable="droppable"
            :index="i"
            :isDraggable="isDraggable"
            :item="item"
            :structureId="id"
            :touchDuration="touchDuration"
            @draggable="
              (value) => {
                draggable = value
                  ? {
                      ...value,
                      index: i,
                      type: resolveItemType?.(value.item as any),
                      structureId: allowCrossDrop ? null : id,
                      remove: (isSameStructure) => {
                        const items = modelValue.filter((_, j) => i !== j)
                        $emit('update:modelValue', items)
                        if (!isSameStructure) {
                          $emit('commit', items)
                        }
                        return items
                      },
                    }
                  : null
              }
            "
            @drop="onDrop(i, $event)"
          >
            <template v-if="$slots.header" #header="headerProps">
              <slot
                :disabled="disabled"
                :index="headerProps.index"
                :item="(headerProps as { item: TItem }).item"
                name="header"
              />
            </template>

            <template v-if="$slots.item" #item="itemProps">
              <slot
                :disabled="disabled"
                :index="itemProps.index"
                :item="(itemProps as { item: TItem }).item"
                name="item"
              />
            </template>
          </PUIStructureItem>

          <slot :index="i" :item="item" name="itemAfter" />
        </template>
      </div>

      <div
        v-else-if="droppable && !disabled"
        @mouseup="onDrop(0, 'before')"
        class="pui-structure-empty-zone"
        :class="{ 'pui-structure-empty-zone-highlighted': draggable?.touch }"
      >
        <p>{{ dropItemsHereLabel }}</p>
      </div>
    </div>
  </div>
</template>

<script generic="TItem extends Record<string, any>, TType extends string | undefined = undefined" lang="ts" setup>
import { isDefined, isNull } from '@pruvious/utils'
import { onClickOutside } from '@vueuse/core'
import { usePUIStructureDraggable } from '../pui/structure'

const props = defineProps({
  /**
   * The value of the structure field.
   */
  modelValue: {
    type: Array as PropType<TItem[]>,
    required: true,
  },

  /**
   * An array of unique identifiers representing different item types.
   * Types are used to filter the items that can be added to the structure.
   * If not provided, the structure supports adding any item type.
   *
   * @default undefined
   */
  types: {
    type: Array as PropType<TType[]>,
  },

  /**
   * A function to resolve the type of an item.
   * Receives the item as parameter and returns the item type.
   */
  resolveItemType: {
    type: Function as PropType<(item: TItem) => TType>,
  },

  /**
   * Controls whether the items in the structure can be dragged.
   *
   * @default true
   */
  isDraggable: {
    type: Boolean,
    default: true,
  },

  /**
   * Controls whether the items in the structure can be dropped in other structure components.
   *
   * @default false
   */
  allowCrossDrop: {
    type: Boolean,
    default: false,
  },

  /**
   * Text label for the empty dropzone.
   *
   * @default 'Drop items here'
   */
  dropItemsHereLabel: {
    type: String,
    default: 'Drop items here',
  },

  /**
   * Controls whether the structure is disabled and read-only.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
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
  'update:modelValue': [value: TItem[]]
  'commit': [value: TItem[]]
}>()

provide('floatingStrategy', 'absolute')

const id = useId()
const container = useTemplateRef('container')
const draggable = usePUIStructureDraggable()
const droppable = computed(() => {
  if (draggable.value) {
    if (isNull(draggable.value.structureId)) {
      if (props.allowCrossDrop) {
        if (
          isDefined(props.types) &&
          isDefined(draggable.value.type) &&
          !props.types.includes(draggable.value.type as TType)
        ) {
          return false
        }

        return true
      }
    } else if (draggable.value.structureId && draggable.value.structureId === id) {
      return true
    }
  }

  return false
})

onClickOutside(container, () => {
  if (droppable.value) {
    draggable.value = null
  }
})

function onDrop(index: number, position: 'before' | 'after') {
  if (draggable.value) {
    const { item, index: draggableIndex, remove } = draggable.value
    const isSameStructure = props.modelValue.includes(item as TItem)

    if (position === 'after') {
      index++
    }

    if (props.modelValue.includes(item as any)) {
      const items = remove(isSameStructure)

      if (index > draggableIndex) {
        index--
      }

      emit('update:modelValue', [...items.slice(0, index), item as any, ...items.slice(index)])
    } else {
      emit('update:modelValue', [...props.modelValue.slice(0, index), item as any, ...props.modelValue.slice(index)])
      nextTick(() => remove(isSameStructure))
    }

    nextTick(() => nextTick(() => emit('commit', props.modelValue)))

    draggable.value = null
  }
}
</script>

<style>
.pui-structure {
  --pui-base-size: var(--pui-size);
  width: 100%;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-structure-items {
  display: flex;
  flex-direction: column;
  gap: var(--pui-gap, 0.75rem);
}

.pui-structure-empty-zone {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 2rem;
  padding: 0.25rem 0.75rem;
  background-color: hsl(var(--pui-card));
  border-width: 1px;
  border-radius: var(--pui-radius);
  color: hsl(var(--pui-muted-foreground));
  font-size: calc(1em - 0.0625rem);
}

.pui-structure-empty-zone:hover,
.pui-structure-empty-zone-highlighted {
  border-width: 2px;
  border-color: hsl(var(--pui-primary));
}
</style>
