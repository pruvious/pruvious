<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :name="name">
      <span :title="formatted" class="pui-truncate">
        {{ formatted }}
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
import { dayjsConfig, dayjsUTC } from '#pruvious/client/dayjs'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { castToNumber, isString } from '@pruvious/utils'

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
    type: Number,
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
    type: Object as PropType<SerializableFieldOptions<'time'>>,
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
const { timeFormat } = dayjsConfig()
const formatted = computed(() => dayjsUTC(props.modelValue).format(timeFormat))
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
