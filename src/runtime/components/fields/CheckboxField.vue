<template>
  <div class="relative flex w-full flex-col items-start gap-1">
    <label v-pruvious-tooltip="__('pruvious-dashboard', options.description as any)" :for="id" class="flex gap-2">
      <input
        :checked="modelValue"
        :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
        :disabled="disabled"
        :id="id"
        :indeterminate="indeterminate"
        :name="name"
        @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        type="checkbox"
        class="mt-px h-4 w-4 shrink-0 appearance-none rounded border bg-contain bg-center outline-none transition focus:ring"
        :class="{
          'bg-white': !modelValue && !indeterminate,
          'border-primary-700 bg-primary-700': modelValue || indeterminate,
          'indeterminate': indeterminate,
          'hocus:border-primary-700': !disabled,
          'border-primary-400': highlighted && !disabled,
          'mt-0': !options.label,
        }"
      />

      <span
        class="flex gap-1 text-vs empty:hidden"
        :class="{
          'text-gray-400': disabled,
          'cursor-move': isSortable,
        }"
      >
        <strong v-if="options.required" :title="__('pruvious-dashboard', 'Required')" class="text-red-500">*</strong>
        <slot>{{ __('pruvious-dashboard', options.label as any) }}</slot>
      </span>
    </label>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import type { StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
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
  options: StandardFieldOptions['checkbox']

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

  /**
   * Indicates whether the checkbox is in an indeterminate state.
   * By default, the checkbox is not in an indeterminate state.
   */
  indeterminate?: boolean

  /**
   * Indicates whether the field is sortable.
   * By default, the field is not sortable.
   */
  isSortable?: boolean

  /**
   * Indicates whether the field input is slightly highlighted.
   * By default, the field input is not highlighted.
   */
  highlighted?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const id = pruviousUnique('checkbox-field')
const name = props.options.name || pruviousUnique(props.fieldKey || 'checkbox-field')

const PruviousInputError = dashboardMiscComponent.InputError()

await loadTranslatableStrings('pruvious-dashboard')
</script>

<style scoped>
input:checked {
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
}

input.indeterminate {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 16 16'%3e%3cpath stroke='white' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 8h8'/%3e%3c/svg%3e");
}
</style>
