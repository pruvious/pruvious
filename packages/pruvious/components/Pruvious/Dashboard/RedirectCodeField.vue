<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <PUIButtonGroup
      :choices="choices"
      :disabled="disabled || !choices.length"
      :error="!!error"
      :id="id"
      :modelValue="modelValue"
      :name="name"
      @update:modelValue="$emit('update:modelValue', $event as 301 | 302)"
      variant="accent"
    />

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUIButtonGroupChoiceModel } from '@pruvious/ui/components/PUIButtonGroup.vue'

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
    type: Object as PropType<SerializableFieldOptions<'number'>>,
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
  'commit': [value: 301 | 302]
  'update:modelValue': [value: 301 | 302]
}>()

const id = useId()
const choices: PUIButtonGroupChoiceModel[] = [{ value: 301 }, { value: 302 }]
</script>
