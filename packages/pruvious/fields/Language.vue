<template>
  <component
    :disabled="disabled"
    :error="error"
    :is="component"
    :modelValue="modelValue"
    :name="name"
    :options="{ ...options, choices, ui: { ...options.ui, nullChoiceLabel: '-' } }"
    :path="path"
    :synced="synced"
    :translatable="translatable"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
import { fieldComponents, languages } from '#pruvious/client'
import type { LanguageCode, SerializableFieldOptions } from '#pruvious/server'

defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: [String, null] as PropType<LanguageCode | null>,
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
    type: Object as PropType<SerializableFieldOptions<'language'>>,
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
  'commit': [value: LanguageCode | null]
  'update:modelValue': [value: LanguageCode | null]
}>()

const component = fieldComponents.nullableSelect?.()
const choices = languages.map(({ code, name }) => ({ label: name, value: code }))
</script>
