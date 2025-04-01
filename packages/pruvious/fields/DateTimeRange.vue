<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel
      :id="`${id}--1`"
      :name="name"
      :options="options"
      :synced="synced"
      :translatable="translatable"
    />

    <PUICalendarRange
      :clearable="options.ui.clearable"
      :decorator="options.ui.decorator"
      :disabled="disabled"
      :error="!!error"
      :formatter="options.ui.withTime ? dayjsFormatDateTime : dayjsFormatDate"
      :iconFrom="options.ui.iconFrom"
      :iconTo="options.ui.iconTo"
      :id="id"
      :initial="options.ui.initial"
      :labels="labels"
      :max="options.max"
      :maxRange="options.maxRange"
      :min="options.min"
      :minRange="options.minRange"
      :modelValue="modelValue ?? [null, null]"
      :name="path"
      :placeholderFrom="placeholderFrom"
      :placeholderTo="placeholderTo"
      :showSeconds="options.ui.showSeconds"
      :startDay="options.ui.startDay"
      :timezone="options.ui.timezone"
      :withTime="options.ui.withTime"
      @commit="$emit('commit', $event.every(isNull) ? null : $event)"
      @update:modelValue="$emit('update:modelValue', $event.every(isNull) ? null : $event)"
    />

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, dayjsFormatDate, dayjsFormatDateTime, dayjsLocales, maybeTranslate, useLanguage } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUICalendarLabels } from '@pruvious/ui/components/PUICalendar.vue'
import { isNull } from '@pruvious/utils'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: [Array, null] as PropType<[number | null, number | null] | null>,
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
    type: Object as PropType<SerializableFieldOptions<'dateTimeRange'>>,
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
  'commit': [value: [number | null, number | null] | null]
  'update:modelValue': [value: [number | null, number | null] | null]
}>()

const id = useId()
const placeholderFrom = maybeTranslate(props.options.ui.placeholderFrom)
const placeholderTo = maybeTranslate(props.options.ui.placeholderTo)
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
</script>
