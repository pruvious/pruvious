<template>
  <div class="relative m-auto h-full w-full flex-col items-start gap-1">
    <span>{{ __('pruvious-dashboard', 'This field cannot be displayed in the UI') }}</span>
    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import type { CastedBlockData, StandardFieldOptions } from '#pruvious'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: CastedBlockData

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['file']

  /**
   * Represents the unique identifier of the field within the form.
   * If not provided, a unique identifier will be automatically generated.
   */
  fieldKey?: string

  /**
   * Represents a dictionary of all errors, where the key is the complete field name and the value is the associated error message.
   * The field name is represented in dot-notation (e.g., `repeater.0.subfieldName`).
   */
  errors?: Record<string, string>

  /**
   * Indicates whether the field is disabled.
   * By default, the field is enabled.
   */
  disabled?: boolean

  /**
   * When set to `true`, the field will won't autofocus in popups.
   */
  ignoreAutofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [CastedBlockData]
}>()

await loadTranslatableStrings('pruvious-dashboard')
</script>
