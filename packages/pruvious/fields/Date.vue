<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <PUICalendar
      :clearable="options.ui.clearable"
      :disabled="disabled"
      :error="!!error"
      :formatter="formatter"
      :icon="options.ui.icon"
      :id="id"
      :initial="options.ui.initial"
      :labels="labels"
      :max="options.max"
      :min="options.min"
      :modelValue="modelValue"
      :name="path"
      :placeholder="placeholder"
      :startDay="options.ui.startDay"
      @commit="$emit('commit', $event)"
      @update:modelValue="$emit('update:modelValue', $event)"
    />

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, dayjsConfig, dayjsLocales, maybeTranslate, useLanguage } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUICalendarLabels } from '@pruvious/ui/components/PUICalendar.vue'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: [Number, null],
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
    type: Object as PropType<SerializableFieldOptions<'date'>>,
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
  'commit': [value: number | null]
  'update:modelValue': [value: number | null]
}>()

const id = useId()
const placeholder = maybeTranslate(props.options.ui.placeholder)
const language = useLanguage()
const dayjsLocale = dayjsLocales[language.value as keyof typeof dayjsLocales]?.()
const labels: PUICalendarLabels = {
  clear: __('pruvious-dashboard', 'Clear'),
  days: dayjsLocale?.weekdays,
  daysShort: dayjsLocale?.weekdaysShort,
  months: dayjsLocale?.months,
  nextMonth: __('pruvious-dashboard', 'Next month'),
  previousMonth: __('pruvious-dashboard', 'Previous month'),
  selectDate: __('pruvious-dashboard', 'Select date'),
}

function formatter(timestamp: number): string {
  const { dayjs, language, dateFormat } = dayjsConfig()
  return dayjs.utc(timestamp).locale(language).format(dateFormat)
}
</script>
