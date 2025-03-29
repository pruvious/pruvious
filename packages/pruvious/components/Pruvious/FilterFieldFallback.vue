<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PUIButtonGroup
      v-if="options._dataType === 'boolean'"
      :choices="[
        { value: false, label: __('pruvious-dashboard', 'False') },
        { value: true, label: __('pruvious-dashboard', 'True') },
      ]"
      :id="id"
      :modelValue="Boolean(modelValue.value)"
      :name="id"
      @update:modelValue="
        (value) => {
          $emit('update:modelValue', { ...modelValue, value: value as any })
          $emit('commit', { ...modelValue, value: value as any })
        }
      "
      variant="accent"
    />

    <PUIInput
      v-else-if="options._dataType === 'text'"
      :id="id"
      :modelValue="String(modelValue.value)"
      :name="id"
      @blur="(_, value) => $emit('commit', { ...modelValue, value })"
      @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event })"
    />

    <PUINumber
      v-else
      :decimalPlaces="options.decimalPlaces"
      :id="id"
      :max="options.max"
      :min="options.min"
      :modelValue="Number(modelValue.value)"
      :name="id"
      :suffix="options.ui?.suffix"
      @commit="$emit('commit', { ...modelValue, value: $event })"
      @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event })"
      showSteppers
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, type WhereField } from '#pruvious/client'
import type { GenericSerializableFieldOptions } from '#pruvious/server'

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
    type: Object as PropType<GenericSerializableFieldOptions>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
</script>
