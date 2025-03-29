<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PUICalendar
      :formatter="options.withTime ? dayjsFormatDateTime : dayjsFormatDate"
      :icon="options.ui.icon"
      :id="id"
      :initial="options.ui.initial"
      :labels="labels"
      :max="options.max"
      :min="options.min"
      :modelValue="modelValue.value === null ? null : Number(modelValue.value)"
      :name="id"
      :showSeconds="options.ui.showSeconds"
      :startDay="options.ui.startDay"
      :timezone="options.timezone"
      :withTime="options.withTime"
      @commit="$emit('commit', { ...modelValue, value: $event })"
      @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event })"
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, dayjsFormatDate, dayjsFormatDateTime, dayjsLocales, useLanguage, type WhereField } from '#pruvious/client'
import type { GenericSerializableFieldOptions } from '#pruvious/server'
import type { PUICalendarLabels } from '@pruvious/ui/components/PUICalendar.vue'

defineProps({
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
    type: Object as PropType<GenericSerializableFieldOptions>,
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
</script>
