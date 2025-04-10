<template>
  <PUIField v-if="!options.ui.hidden" class="p-short-field">
    <PUICheckbox
      :disabled="disabled"
      :error="!!error"
      :id="id"
      :modelValue="modelValue"
      :name="name"
      :variant="options.ui.variant"
      @update:modelValue="
        (value) => {
          $emit('update:modelValue', value)
          $emit('commit', value)
        }
      "
    >
      {{ label }}
    </PUICheckbox>

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { resolveFieldLabel } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Boolean,
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
    type: Object as PropType<SerializableFieldOptions<'checkbox'>>,
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
})

defineEmits<{
  'commit': [value: boolean]
  'update:modelValue': [value: boolean]
}>()

const id = useId()
const label = resolveFieldLabel(props.options.ui.label, props.name)
</script>
