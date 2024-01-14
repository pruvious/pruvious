<template>
  <div :title="stringifiedValue" class="truncate" :class="{ 'text-gray-400': !stringifiedValue }">
    {{
      stringifiedValue
        ? value
          ? __('pruvious-dashboard', 'true')
          : __('pruvious-dashboard', 'false')
        : __('pruvious-dashboard', collection.fields[name].additional.emptyLabel as any)
    }}
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { isBoolean } from '../../utils/common'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Boolean,
  },
  options: {
    type: Object,
    required: true,
  },
  canUpdate: {
    type: Boolean,
    default: false,
  },
  record: {
    type: Object as PropType<Record<string, any>>,
  },
  language: {
    type: String,
  },
})

const emit = defineEmits<{
  refresh: []
}>()

await loadTranslatableStrings('pruvious-dashboard')

const dashboard = usePruviousDashboard()

const collection = dashboard.value.collections[dashboard.value.collection!]
const stringifiedValue = ref('')

watch(
  () => props.value,
  () => {
    stringifiedValue.value = isBoolean(props.value)
      ? props.value
        ? __('pruvious-dashboard', 'true')
        : __('pruvious-dashboard', 'false')
      : ''
  },
  { immediate: true },
)
</script>
