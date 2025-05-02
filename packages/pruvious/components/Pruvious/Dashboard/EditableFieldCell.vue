<template>
  <div ref="root" class="p-editable-field-cell" :class="{ 'p-editable-field-cell-wrap': wrap }">
    <slot>-</slot>

    <div class="p-editable-field-cell-button" :class="`p-editable-field-cell-button-${resolvedEditButtonPosition}`">
      <PUIButton
        :size="-3"
        :title="editable ? __('pruvious-dashboard', 'Edit field value') : __('pruvious-dashboard', 'View field value')"
        @click="navigateTo({ query: { ...$route.query, edit: `${name}:${cell.row.id}` } })"
        variant="outline"
      >
        <Icon v-if="editable" mode="svg" name="tabler:pencil" />
        <Icon v-else mode="svg" name="tabler:list-search" />
      </PUIButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/client'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'

const props = defineProps({
  /**
   * The table cell props containing the row data, column definition, and other cell-related information.
   */
  cell: {
    type: Object as PropType<PUICell<PUIColumns>>,
    required: true,
  },

  /**
   * The field name defined in a collection.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * Specifies whether the field is editable.
   */
  editable: {
    type: Boolean,
    required: true,
  },

  /**
   * Controls how the edit button is positioned within its container.
   *
   * - `relative` - The button is positioned relative to its container.
   * - `absolute` - The button is positioned absolutely within its container (bottom right).
   * - `auto` - The button is positioned automatically based on available space (default).
   *
   * @default 'relative'
   */
  editButtonPosition: {
    type: String as PropType<'auto' | 'absolute' | 'relative'>,
    default: 'relative',
  },

  /**
   * Determines if items should wrap to the next line when there isn't enough space.
   *
   * @default false
   */
  wrap: {
    type: Boolean,
    default: false,
  },
})

const root = useTemplateRef('root')
const resolvedEditButtonPosition = ref(props.editButtonPosition === 'auto' ? 'relative' : props.editButtonPosition)

watch(
  () => props.editButtonPosition,
  (position) => {
    setTimeout(() => {
      if (position === 'auto') {
        const cell = root.value?.parentElement?.parentElement
        const lastItem = root.value?.querySelector('.p-item:last-of-type')

        if (cell && lastItem) {
          const { right: parentRight } = cell.getBoundingClientRect()
          const { right: childRight } = lastItem.getBoundingClientRect()
          resolvedEditButtonPosition.value = parentRight - childRight < 32 ? 'absolute' : 'relative'
        }
      } else {
        resolvedEditButtonPosition.value = position
      }
    })
  },
  { immediate: true },
)
</script>

<style scoped>
.p-editable-field-cell {
  position: relative;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  min-height: 1.5rem;
}

.p-editable-field-cell-wrap {
  flex-wrap: wrap;
}

.p-editable-field-cell-button {
  flex-shrink: 0;
  display: none;
}

:where(td):hover .p-editable-field-cell-button,
:where(td):focus-within .p-editable-field-cell-button {
  display: inline-flex;
}

.p-editable-field-cell-button-absolute {
  position: absolute;
  right: 0;
  bottom: 0;
  margin: -0.125rem;
  padding: 0.125rem;
  background-color: hsl(var(--pui-background));
  border-radius: var(--pui-radius);
}
</style>
