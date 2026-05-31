<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :name="name">
      <span :title="tooltip" class="p-color-cell">
        <span
          v-if="modelValue"
          :class="['p-color-cell-swatch', { 'p-color-cell-checker': hasAlphaChannel(modelValue) }]"
        >
          <span class="p-color-cell-fill" :style="{ 'background-color': modelValue }"></span>
        </span>
        <span class="pui-truncate">{{ label }}</span>
      </span>
    </PruviousDashboardEditableFieldCell>

    <PruviousDashboardEditTableFieldPopup
      v-if="isEditPopupVisible"
      :cell="cell"
      :collection="collection"
      :disabled="!editable"
      :modelValue="modelValue"
      :name="name"
      :options="options"
      @close="$event().then(() => (isEditPopupVisible = false))"
      @updated="refresh?.(true)"
    />
  </div>
</template>

<script lang="ts" setup>
import { maybeTranslate } from '#pruvious/dashboard'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { castToNumber, hasAlphaChannel, isString } from '@pruvious/utils'

const props = defineProps({
  /**
   * The table cell props containing the row data, column definition, and other cell-related information.
   */
  cell: {
    type: Object as PropType<PUICell<PUIColumns>>,
    required: true,
  },

  /**
   * The casted field value.
   */
  modelValue: {
    type: String as PropType<string | null>,
  },

  /**
   * The field name defined in a collection.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'nullableColor'>>,
    required: true,
  },

  /**
   * The name and definition of the current translatable collection.
   */
  collection: {
    type: Object as PropType<{ name: keyof Collections; definition: SerializableCollection }>,
    required: true,
  },

  /**
   * Triggers a data refresh operation by executing the callback function with the current URL query parameters.
   *
   * The operation is skipped if the URL query parameters have not changed since the last refresh.
   * The `force` parameter can be used to force a refresh operation even if the URL query parameters have not changed.
   * By default, the operation is not forced.
   *
   * Returns a `Promise` that resolves when the refresh operation is complete.
   */
  refresh: {
    type: Function as PropType<(force?: boolean) => Promise<void>>,
  },

  /**
   * Specifies whether the field is editable.
   *
   * @default false
   */
  editable: {
    type: Boolean,
    default: false,
  },
})

const route = useRoute()

const matchedLabel = computed<string | undefined>(() => {
  if (!props.modelValue) {
    return undefined
  }
  for (const entry of props.options.colors) {
    if (isString(entry)) {
      if (entry === props.modelValue) return undefined
    } else if ('colors' in entry) {
      for (const c of entry.colors) {
        if (isString(c)) {
          if (c === props.modelValue) return undefined
        } else if (c.value === props.modelValue) {
          return c.label ? maybeTranslate(c.label) : undefined
        }
      }
    } else if (entry.value === props.modelValue) {
      return entry.label ? maybeTranslate(entry.label) : undefined
    }
  }
  return undefined
})

const label = computed(() => matchedLabel.value || props.modelValue || '-')
const tooltip = computed(() => {
  if (!props.modelValue) return '-'
  return matchedLabel.value ? `${matchedLabel.value} (${props.modelValue})` : props.modelValue
})

const isEditPopupVisible = ref(false)

watch(
  () => route.query,
  () => {
    if (isString(route.query.edit)) {
      const [fieldName, id] = route.query.edit.split(':')
      if (fieldName === props.name && castToNumber(id) === props.cell.row.id) {
        isEditPopupVisible.value = true
      }
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.p-color-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
}

.p-color-cell-swatch {
  position: relative;
  flex: 0 0 1.25rem;
  width: 1.25rem;
  height: 1.25rem;
  overflow: hidden;
  border-radius: 9999px;
  border: 1px solid hsl(var(--pui-border));
}

.p-color-cell-checker {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA5SURBVHgB7dGxEQAgDELRxDHYfzVYIzoChYXnQf3vNTTJKWMAnKxWXV7AgC+APWdOKMnJckrAP8ENTFgK0Z64q28AAAAASUVORK5CYII=');
}

.p-color-cell-fill {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
}
</style>
