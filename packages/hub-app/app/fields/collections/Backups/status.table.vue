<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :name="name">
      <PruviousDashboardHubStatusChip :modelValue="modelValue" />
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
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { castToNumber, isString } from '@pruvious/utils'

const props = defineProps({
  cell: {
    type: Object as PropType<PUICell<PUIColumns>>,
    required: true,
  },
  modelValue: {
    type: [String, null],
  },
  name: {
    type: String,
    required: true,
  },
  options: {
    type: Object as PropType<SerializableFieldOptions<'select'>>,
    required: true,
  },
  collection: {
    type: Object as PropType<{ name: keyof Collections; definition: SerializableCollection }>,
    required: true,
  },
  refresh: {
    type: Function as PropType<(force?: boolean) => Promise<void>>,
  },
  editable: {
    type: Boolean,
    default: false,
  },
})

const route = useRoute()
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
