<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :name="name">
      <span :title="modelValue ?? '-'" class="p-icon-cell">
        <span v-if="modelValue" class="p-icon-cell-preview">
          <img :alt="modelValue" :src="iconUrl" />
        </span>
        <span class="pui-truncate">{{ modelValue || '-' }}</span>
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
import { buildIconUrl } from '#pruvious/app'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { castToNumber, isEmpty, isString } from '@pruvious/utils'

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
    type: Object as PropType<SerializableFieldOptions<'icon'>>,
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

const iconUrl = computed(() => {
  if (isEmpty(props.modelValue)) {
    return ''
  }
  return buildIconUrl(props.options.dir ?? null, props.modelValue!)
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
.p-icon-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
}

.p-icon-cell-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 1.5rem;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0.25rem;
  background-color: hsl(var(--pui-accent));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  color: hsl(var(--pui-accent-foreground));
}

.p-icon-cell-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
