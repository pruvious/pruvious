<template>
  <div :title="stringifiedValue" class="truncate" :class="{ 'text-gray-400': !stringifiedValue }">
    {{ stringifiedValue || __('pruvious-dashboard', collection.fields[name].additional.emptyLabel as any) }}
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { isNull, isUndefined } from '../../utils/common'
import { isNumber } from '../../utils/number'
import { isString } from '../../utils/string'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: [Number, Object, String],
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

const dashboard = usePruviousDashboard()

const collection = dashboard.value.collections[dashboard.value.collection!]
const stringifiedValue = ref('')

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.value,
  () => {
    stringifiedValue.value = isString(props.value)
      ? props.value
      : isNumber(props.value)
      ? props.value.toString()
      : isNull(props.value) || isUndefined(props.value)
      ? ''
      : JSON.stringify(props.value)
  },
  { immediate: true },
)
</script>
