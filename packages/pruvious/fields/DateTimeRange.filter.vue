<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="[
      { value: 'eq', label: __('pruvious-dashboard', 'Equals') },
      { value: 'ne', label: __('pruvious-dashboard', 'Does not equal') },
      { value: 'startsWith', label: __('pruvious-dashboard', 'From') },
      { value: 'endsWith', label: __('pruvious-dashboard', 'To') },
    ]"
    :options="options"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PruviousDashboardDateTimeRangeFilterTuple
      v-if="modelValue.operator === 'eq' || modelValue.operator === 'ne'"
      :modelValue="modelValue"
      :options="options"
      @commit="
        (value) => {
          $emit('update:modelValue', value)
          $emit('commit', value)
        }
      "
    />

    <PruviousDashboardDateTimeRangeFilterPrimitive
      v-else
      :modelValue="modelValue"
      :options="options"
      @commit="
        (value) => {
          $emit('update:modelValue', value)
          $emit('commit', value)
        }
      "
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'

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
    type: Object as PropType<SerializableFieldOptions<'dateTimeRange'>>,
    required: true,
  },
})

const emit = defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

watch(
  () => props.modelValue.operator,
  (newOperator, oldOperator) => {
    const newType = newOperator === 'eq' || newOperator === 'ne'
    const oldType = oldOperator === 'eq' || oldOperator === 'ne'

    if (newType === oldType) {
      emit('commit', { ...props.modelValue, operator: newOperator })
    }
  },
)
</script>
