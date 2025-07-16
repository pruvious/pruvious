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
    :startDay="options.ui.startDay"
    @commit="$emit('commit', { ...modelValue, value: prepareEmitValue($event) })"
    @update:modelValue="$emit('update:modelValue', { ...modelValue, value: prepareEmitValue($event) })"
  />
</template>

<script lang="ts" setup>
import { __, useLanguage, type WhereField } from '#pruvious/client'
import { dayjsConfig, dayjsLocales } from '#pruvious/client/dayjs'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUICalendarLabels } from '@pruvious/ui/components/PUICalendar.vue'
import { puiParseTimeSpan } from '@pruvious/ui/pui/date'
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
    type: Object as PropType<SerializableFieldOptions<'dateRange'>>,
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
  const { dayjs, language, dateFormat } = dayjsConfig()
  return dayjs.utc(timestamp).locale(language).format(dateFormat)
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
