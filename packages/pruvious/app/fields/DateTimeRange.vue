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
      :error="!!resolvedError"
      :formatter="formatter"
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
      :timezone="timezone"
      :withTime="true"
      @commit="$emit('commit', $event.every(isNull) ? null : $event)"
      @update:modelValue="$emit('update:modelValue', $event.every(isNull) ? null : $event)"
    />

    <PruviousFieldMessage :error="resolvedError" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, maybeTranslate, useLanguage } from '#pruvious/client'
import { dayjsConfig, dayjsLocales, dayjsResolveTimezone } from '#pruvious/client/dayjs'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUICalendarLabels } from '@pruvious/ui/components/PUICalendar.vue'
import { isNull, isObject, isString } from '@pruvious/utils'

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
    type: [String, Object] as PropType<string | Record<string, string>>,
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
const timezone = computed(() => dayjsResolveTimezone(props.options.ui.timezone))
const resolvedError = computed(() =>
  isString(props.error) ? props.error : isObject(props.error) ? Object.values(props.error) : undefined,
)

function formatter(timestamp: number): string {
  const { dayjs, language, dateFormat, timeFormat } = dayjsConfig()
  const timezone = dayjsResolveTimezone(props.options.ui.timezone)
  const date = dayjs(timestamp).tz(timezone).locale(language)
  return date.format(`${dateFormat} ${timeFormat}`)
}
</script>
