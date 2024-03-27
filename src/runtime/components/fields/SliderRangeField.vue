<template>
  <div class="relative flex w-full flex-col items-start gap-1">
    <div v-if="options.label || options.description" class="flex w-full items-end justify-between gap-4">
      <div v-if="options.label" class="flex cursor-default gap-1 whitespace-nowrap text-vs font-medium text-gray-900">
        <span v-if="options.required" :title="__('pruvious-dashboard', 'Required')" class="text-red-500">*</span>
        <span>{{ __('pruvious-dashboard', options.label as any) }}</span>
      </div>

      <PruviousIconHelp
        v-if="options.description"
        v-pruvious-tooltip="__('pruvious-dashboard', options.description as any)"
        class="mb-0.5 h-4 w-4 shrink-0 text-gray-400"
      />
    </div>

    <div class="slider flex w-full items-center gap-3" :class="{ 'mb-4': !options.inputs }">
      <VueSlider
        :contained="true"
        :disabled="disabled"
        :interval="options.step"
        :lazy="true"
        :marks="options.marks"
        :max="options.max"
        :maxRange="options.maxRange"
        :min="options.min"
        :minRange="options.minRange"
        :modelValue="modelValue"
        @update:modelValue="emit('update:modelValue', $event)"
        class="flex-1"
      />

      <component
        v-if="options.inputs"
        :is="RangeField"
        :modelValue="modelValue"
        :options="{
          min: options.min,
          max: options.max,
          minRange: options.minRange,
          maxRange: options.maxRange,
          step: options.step,
        }"
        @update:modelValue="emit('update:modelValue', $event)"
        :style="{ width: `${inputSize * 1.1 + 5.8}rem` }"
      />
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { type StandardFieldOptions } from '#pruvious'
import { rangeFieldComponent } from '#pruvious/dashboard'
// @ts-ignore
import { dashboardMiscComponent } from '#pruvious/dashboard'
import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/antd.css'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { isInteger } from '../../utils/number'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: [number, number]

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['slider-range']

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
  'update:modelValue': [[number, number]]
}>()

const inputSize = computed(
  () =>
    Math.max(
      props.options.min!.toString().replace(/[^0-9]/g, '').length,
      props.options.max!.toString().replace(/[^0-9]/g, '').length,
    ) + (isInteger(props.options.step!) ? 0 : props.options.step!.toString().split('.')[1].length + 1),
)

const RangeField = rangeFieldComponent()
const PruviousInputError = dashboardMiscComponent.InputError()

await loadTranslatableStrings('pruvious-dashboard')
</script>
