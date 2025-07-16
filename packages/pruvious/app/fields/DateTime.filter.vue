<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="operatorChoices"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PUICalendar
      v-if="modelValue.value !== undefined"
      :formatter="formatter"
      :icon="options.ui.icon"
      :id="id"
      :initial="options.ui.initial"
      :labels="labels"
      :max="options.max"
      :min="options.min"
      :modelValue="modelValue.value === null ? null : Number(modelValue.value)"
      :name="id"
      :placeholder="__('pruvious-dashboard', 'Empty')"
      :showSeconds="options.ui.showSeconds"
      :startDay="options.ui.startDay"
      :timezone="timezone"
      :withTime="true"
      @commit="$emit('commit', { ...modelValue, value: $event })"
      @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event })"
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, getValidFilterOperators, useLanguage, type WhereField } from '#pruvious/client'
import { dayjsConfig, dayjsLocales, dayjsResolveTimezone } from '#pruvious/client/dayjs'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUICalendarLabels } from '@pruvious/ui/components/PUICalendar.vue'

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
    type: Object as PropType<SerializableFieldOptions<'dateTime'>>,
    required: true,
  },
})

defineEmits<{
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
const operatorChoices = getValidFilterOperators(props.options).map(({ value, label }) => {
  if (value === 'gt') {
    return { value, label: __('pruvious-dashboard', 'After') }
  } else if (value === 'gte') {
    return { value, label: __('pruvious-dashboard', 'After or equal to') }
  } else if (value === 'lt') {
    return { value, label: __('pruvious-dashboard', 'Before') }
  } else if (value === 'lte') {
    return { value, label: __('pruvious-dashboard', 'Before or equal to') }
  } else {
    return { value, label }
  }
})
const timezone = computed(() => dayjsResolveTimezone(props.options.ui.timezone))

function formatter(timestamp: number): string {
  const { dayjs, language, dateFormat, timeFormat } = dayjsConfig()
  const timezone = dayjsResolveTimezone(props.options.ui.timezone)
  const date = dayjs(timestamp).tz(timezone).locale(language)
  return date.format(`${dateFormat} ${timeFormat}`)
}
</script>
