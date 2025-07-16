<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="[
      { value: 'includes', label: __('pruvious-dashboard', 'Includes all') },
      { value: 'includesAny', label: __('pruvious-dashboard', 'Includes any') },
      { value: 'excludes', label: __('pruvious-dashboard', 'Excludes all') },
      { value: 'excludesAny', label: __('pruvious-dashboard', 'Excludes any') },
    ]"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <!-- @todo operators and records field -->
    <pre>{{ modelValue }}</pre>
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'

defineProps({
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
    type: Object as PropType<SerializableFieldOptions<'records'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
</script>
