<template>
  <div>
    <component
      :disabled="disabled"
      :errors="errors"
      :fieldKey="fieldKey"
      :ignoreAutofocus="ignoreAutofocus"
      :is="ButtonFieldGroup"
      :modelValue="stringValue"
      :options="{
        choices,
        name,
        default: options.default ? '1' : '0',
        description: options.description,
        label: options.label,
        required: options.required,
      }"
      @update:modelValue="emit('update:modelValue', $event === '1')"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import type { StandardFieldOptions } from '#pruvious'
import { buttonGroupFieldComponent } from '#pruvious/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: boolean

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['switch']

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
  'update:modelValue': [boolean]
}>()

const ButtonFieldGroup = buttonGroupFieldComponent()

const choices = ref<Record<string, string>>({})
const name = props.options.name || pruviousUnique(props.fieldKey || 'switch-field')
const stringValue = ref('0')

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.modelValue,
  (value) => (stringValue.value = value ? '1' : '0'),
  { immediate: true },
)

watch(
  () => props.options,
  ({ falseLabel, trueLabel }) => {
    choices.value = {
      '0': falseLabel ? __('pruvious-dashboard', falseLabel as any) : __('pruvious-dashboard', 'No'),
      '1': trueLabel ? __('pruvious-dashboard', trueLabel as any) : __('pruvious-dashboard', 'Yes'),
    }
  },
  { immediate: true },
)
</script>
