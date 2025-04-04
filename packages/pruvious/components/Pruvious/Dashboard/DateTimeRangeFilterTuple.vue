<template>
  <PUICalendarRange
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
    :modelValue="sanitized"
    :name="id"
    :placeholderFrom="__('pruvious-dashboard', 'Empty')"
    :placeholderTo="__('pruvious-dashboard', 'Empty')"
    :showSeconds="options.ui.showSeconds"
    :startDay="options.ui.startDay"
    :timezone="timezone"
    :withTime="true"
    @commit="$emit('commit', { ...modelValue, value: prepareEmitValue($event) })"
    @update:modelValue="$emit('update:modelValue', { ...modelValue, value: prepareEmitValue($event) })"
  />
</template>

<script lang="ts" setup>
import { __, dayjsConfig, dayjsLocales, dayjsResolveTimezone, useLanguage, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUICalendarLabels } from '@pruvious/ui/components/PUICalendar.vue'
import { castToNumber, isArray, isInteger, isNotNull, isNull, isString } from '@pruvious/utils'

const props = defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'dateTimeRange'>>,
    required: true,
  },
})

const emit = defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
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
const minRange = computed(() => puiParseTimeSpan(props.options.minRange))
const sanitized = computed<[number | null, number | null]>(() => {
  const v = props.modelValue.value

  if (isString(v)) {
    const [from, to] = v.split(',')
    const fromCasted = castToNumber(from?.replace('[', ''))
    const toCasted = castToNumber(to?.replace(']', ''))
    return isInteger(fromCasted) && isInteger(toCasted) ? [fromCasted, toCasted] : [null, null]
  } else if (isArray(v)) {
    const fromCasted = castToNumber(v[0])
    const toCasted = castToNumber(v[1])
    return isInteger(fromCasted) && isInteger(toCasted) ? [fromCasted, toCasted] : [null, null]
  } else if (isInteger(v)) {
    return [v, null]
  }

  return [null, null]
})

emit('commit', { ...props.modelValue, value: prepareEmitValue(sanitized.value) })

function formatter(timestamp: number): string {
  const { dayjs, language, dateFormat, timeFormat } = dayjsConfig()
  const timezone = dayjsResolveTimezone(props.options.ui.timezone)
  const date = dayjs(timestamp).tz(timezone).locale(language)
  return date.format(`${dateFormat} ${timeFormat}`)
}

function prepareEmitValue(value: [number | null, number | null]): string | null {
  if (value.every(isNull) || (value.some(isNull) && sanitized.value.every(isNotNull))) {
    return null
  }

  if (value.some(isNull)) {
    value = isNull(value[0]) ? [value[1]! - minRange.value, value[1]] : [value[0], value[0] + minRange.value]
  }

  return JSON.stringify(value)
}
</script>
