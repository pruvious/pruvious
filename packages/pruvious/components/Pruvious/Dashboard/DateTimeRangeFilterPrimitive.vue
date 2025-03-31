<template>
  <PUICalendar
    :clearable="false"
    :formatter="options.ui.withTime ? dayjsFormatDateTime : dayjsFormatDate"
    :icon="modelValue.operator === 'startsWith' ? options.ui.iconFrom : options.ui.iconTo"
    :id="id"
    :initial="options.ui.initial"
    :labels="labels"
    :max="options.max"
    :min="options.min"
    :modelValue="sanitized"
    :name="id"
    :placeholder="__('pruvious-dashboard', 'Empty')"
    :showSeconds="options.ui.showSeconds"
    :startDay="options.ui.startDay"
    :timezone="options.ui.timezone"
    :withTime="options.ui.withTime"
    @commit="$emit('commit', { ...modelValue, value: prepareEmitValue($event) })"
  />
</template>

<script lang="ts" setup>
import { __, dayjsFormatDate, dayjsFormatDateTime, dayjsLocales, useLanguage, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUICalendarLabels } from '@pruvious/ui/components/PUICalendar.vue'
import { castToNumber, getTimezoneOffset, isArray, isInteger, isNull, isString } from '@pruvious/utils'

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
  commit: [where: WhereField]
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
const sanitized = computed<number | null>(() => {
  const v = props.modelValue.value

  if (isString(v)) {
    const [from, to] = v.split(',')
    const fromCasted = castToNumber(from?.replace('[', ''))
    const toCasted = castToNumber(to?.replace(']', ''))
    const tuple = [isInteger(fromCasted) ? fromCasted : null, isInteger(toCasted) ? toCasted : null]
    return props.modelValue.operator === 'startsWith' ? tuple[0]! : tuple[1]!
  } else if (isArray(v)) {
    const fromCasted = castToNumber(v[0])
    const toCasted = castToNumber(v[1])
    const tuple = [isInteger(fromCasted) ? fromCasted : null, isInteger(toCasted) ? toCasted : null]
    return props.modelValue.operator === 'startsWith' ? tuple[0]! : tuple[1]!
  } else if (isInteger(v)) {
    return v
  }

  return null
})

watch(
  () => props.modelValue.operator,
  () => {
    emit('commit', { ...props.modelValue, value: prepareEmitValue(sanitized.value) })
  },
  { immediate: true },
)

function prepareEmitValue(value: number | null): string {
  if (isNull(value)) {
    const local = new Date()
    const utc = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 0, 0, 0, 0))

    if (props.options.ui.withTime) {
      utc.setUTCHours(local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds())
    }

    const timezoneOffset = isString(props.options.ui.timezone)
      ? getTimezoneOffset(props.options.ui.timezone, utc)
      : props.options.ui.timezone

    value = utc.getTime() - (timezoneOffset ?? 0) * 60000
  }

  return props.modelValue.operator === 'startsWith' ? `[${value},` : `,${value}]`
}
</script>
