<template>
  <div class="pui-structure" :class="{ 'pui-structure-empty': !modelValue.length }" :style="{ '--pui-size': size }">
    <div v-if="modelValue.length || droppable" ref="container">
      <div v-if="modelValue.length" class="pui-structure-items">
        <PUIStructureItem
          v-for="(item, i) of modelValue"
          :disabled="disabled"
          :droppable="droppable"
          :index="i"
          :isDraggable="isDraggable"
          :modelValue="item"
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
                    remove: () => {
                      const items = modelValue.filter((_, j) => i !== j)
                      $emit('update:modelValue', items)
                      return items
                    },
                  }
                : null
            }
          "
          @drop="onDrop(i, $event)"
          @update:modelValue="
            $emit(
              'update:modelValue',
              modelValue.map((item, j) => (i === j ? $event : item) as any),
            )
          "
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
import { onClickOutside } from '@vueuse/core'

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
}>()

const id = useId()
const container = useTemplateRef('container')
const draggable = usePUIStructureDraggable()
const droppable = computed(
  () =>
    !!draggable.value &&
    (!draggable.value.structureId || draggable.value.structureId === id) &&
    (!draggable.value.type || !props.types || props.types?.includes(draggable.value.type as any)),
)

onClickOutside(container, () => {
  if (droppable.value) {
    draggable.value = null
  }
})

function onDrop(index: number, position: 'before' | 'after') {
  if (draggable.value) {
    if (position === 'after') {
      index++
    }

    const items = draggable.value.remove()

    if (props.modelValue.includes(draggable.value.item as any)) {
      if (index > draggable.value.index) {
        index--
      }

      emit('update:modelValue', [...items.slice(0, index), draggable.value.item as any, ...items.slice(index)])
    } else {
      emit('update:modelValue', [
        ...props.modelValue.slice(0, index),
        draggable.value.item as any,
        ...props.modelValue.slice(index),
      ])
    }

    draggable.value = null
  }
}
</script>

<style>
.pui-structure {
  --pui-base-size: var(--pui-size);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-structure-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pui-structure-empty-zone {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 3rem;
  padding: 0.75rem;
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
