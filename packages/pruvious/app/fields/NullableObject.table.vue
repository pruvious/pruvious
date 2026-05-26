<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :force="!!subfieldName" :name="name">
      <PruviousDynamicTableField
        v-if="subfieldName && subfieldOptions"
        :cell="cell"
        :collection="collection"
        :data="data"
        :editable="editable"
        :modelValue="modelValue?.[subfieldName] ?? null"
        :name="`${name}.${subfieldName}`"
        :options="subfieldOptions"
        :refresh="refresh"
        :type="subfieldOptions._fieldType"
      />

      <code v-else v-pui-tooltip="'```\n' + JSON.stringify(modelValue, null, 2) + '\n```'" class="pui-truncate">
        {{ stringifiedValue }}
      </code>
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
import type {
  Collections,
  GenericSerializableFieldOptions,
  SerializableCollection,
  SerializableFieldOptions,
} from '#pruvious/server'
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
    type: Object as PropType<Record<string, any> | null>,
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
    type: Object as PropType<SerializableFieldOptions<'nullableObject'>>,
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
   * The current record data from a collection.
   * Forwarded to the subfield's table component when `ui.dataTable.subfield` is set.
   */
  data: {
    type: Object as PropType<Record<string, any>>,
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
const stringifiedValue = computed(() => (props.modelValue ? JSON.stringify(props.modelValue) : '-'))
const isEditPopupVisible = ref(false)

const subfieldName = computed(() => props.options.ui?.dataTable?.subfield)
const subfieldOptions = computed<GenericSerializableFieldOptions | undefined>(() => {
  const name = subfieldName.value
  if (!name) {
    return undefined
  }
  const subfields = props.options.subfields as Record<string, GenericSerializableFieldOptions> | undefined
  return subfields?.[name]
})

provide('hideEditableFieldCellActions', true)

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
code {
  font-family: var(--pui-font-mono);
  font-size: calc(1em - 0.0625rem);
}
</style>
