<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="operatorChoices"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PUITime
      :id="id"
      :labels="labels"
      :max="options.max"
      :min="options.min"
      :modelValue="Number(modelValue.value)"
      :name="id"
      :showSeconds="options.ui.showSeconds"
      @commit="$emit('commit', { ...modelValue, value: $event })"
      @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event })"
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, getValidFilterOperators, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUITimeLabels } from '@pruvious/ui/components/PUITime.vue'

const props = defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'time'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const labels: PUITimeLabels = {
  hoursSuffix: __('pruvious-dashboard', 'timeSuffix:h'),
  minutesSuffix: __('pruvious-dashboard', 'timeSuffix:m'),
  secondsSuffix: __('pruvious-dashboard', 'timeSuffix:s'),
}
const operatorChoices = getValidFilterOperators(props.options).map(({ value, label }) => {
  if (value === 'gt') {
    return { value, label: __('pruvious-dashboard', 'After') }
  } else if (value === 'gte') {
    return { value, label: __('pruvious-dashboard', 'After or equal to') }
  } else if (value === 'lt') {
    return { value, label: __('pruvious-dashboard', 'Before') }
  } else if (value === 'lte') {
    return { value, label: __('pruvious-dashboard', 'Before or equal to') }
  } else {
    return { value, label }
  }
})
</script>
