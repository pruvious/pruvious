<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <PUITime
      :disabled="disabled"
      :error="!!error"
      :id="id"
      :labels="labels"
      :max="options.max"
      :min="options.min"
      :modelValue="modelValue"
      :name="path"
      :showSeconds="options.ui.showSeconds"
      @commit="$emit('commit', $event)"
      @update:modelValue="$emit('update:modelValue', $event)"
    />

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUITimeLabels } from '@pruvious/ui/components/PUITime.vue'

defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Number,
    required: true,
  },

  /**
   * The field name defined in a collection, singleton, or block.
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
   * The field path, expressed in dot notation, represents the exact location of the field within the current data structure.
   */
  path: {
    type: String,
    required: true,
  },

  /**
   * Represents an error message that can be displayed to the user.
   */
  error: {
    type: String,
  },

  /**
   * Controls whether the field is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * Specifies whether the current data record is translatable.
   *
   * @default false
   */
  translatable: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates if the field value remains synchronized between all translations of the current data record.
   *
   * @default false
   */
  synced: {
    type: Boolean,
    default: false,
  },
})

defineEmits<{
  'commit': [value: number]
  'update:modelValue': [value: number]
}>()

const id = useId()
const labels: PUITimeLabels = {
  hoursSuffix: __('pruvious-dashboard', 'timeSuffix:h'),
  minutesSuffix: __('pruvious-dashboard', 'timeSuffix:m'),
  secondsSuffix: __('pruvious-dashboard', 'timeSuffix:s'),
}
</script>
