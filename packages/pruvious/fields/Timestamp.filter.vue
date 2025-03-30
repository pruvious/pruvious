<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div class="p-timestamp-filter-row">
      <PUIIconGroup
        v-if="options.ui.picker === 'combo'"
        v-model="picker"
        v-pui-tooltip="
          __(
            'pruvious-dashboard',
            'This field stores time with milliseconds precision. When using the calendar selector (which only offers seconds precision), use the `<=` and `>=` operators to ensure you capture all relevant entries. For exact millisecond-level comparisons, use the numeric input field instead.',
          )
        "
        :choices="[
          {
            value: 'calendar',
            icon: options.ui.calendar?.icon ?? 'calendar-week',
            title: __('pruvious-dashboard', 'Calendar'),
          },
          {
            value: 'numeric',
            icon: 'forms',
            title: __('pruvious-dashboard', 'Numeric'),
          },
        ]"
        :id="`${id}--toggle`"
        :name="`${id}--toggle`"
        variant="accent"
      />

      <PUICalendar
        v-if="options.ui.picker === 'calendar' || (options.ui.picker === 'combo' && picker === 'calendar')"
        :clearable="false"
        :formatter="options.ui.calendar?.withTime ? dayjsFormatDateTime : dayjsFormatDate"
        :icon="options.ui.calendar?.icon"
        :id="id"
        :initial="options.ui.calendar?.initial"
        :labels="labels"
        :max="options.max"
        :min="options.min"
        :modelValue="Number(modelValue.value)"
        :name="id"
        :showSeconds="options.ui.calendar?.showSeconds"
        :startDay="options.ui.calendar?.startDay"
        :timezone="options.ui.calendar?.timezone"
        :withTime="options.ui.calendar?.withTime"
        @commit="$emit('commit', { ...modelValue, value: $event })"
        @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event })"
      />

      <PUINumber
        v-if="options.ui.picker === 'numeric' || (options.ui.picker === 'combo' && picker === 'numeric')"
        :id="id"
        :max="options.max"
        :min="options.min"
        :modelValue="Number(modelValue.value)"
        :name="id"
        :showSteppers="true"
        @commit="$emit('commit', { ...modelValue, value: $event })"
        @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event })"
        suffix="ms"
      />
    </div>
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, dayjsFormatDate, dayjsFormatDateTime, dayjsLocales, useLanguage, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
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
    type: Object as PropType<SerializableFieldOptions<'timestamp'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const picker = ref<'calendar' | 'numeric'>('calendar')
const language = useLanguage()
const dayjsLocale = dayjsLocales[language.value as keyof typeof dayjsLocales]?.()
const labels: PUICalendarLabels = {
  days: dayjsLocale?.weekdays,
  daysShort: dayjsLocale?.weekdaysShort,
  months: dayjsLocale?.months,
  nextMonth: __('pruvious-dashboard', 'Next month'),
  previousMonth: __('pruvious-dashboard', 'Previous month'),
  selectDate: __('pruvious-dashboard', 'Select date'),
}
</script>

<style scoped>
.p-timestamp-filter-row {
  display: flex;
  gap: 0.5rem;
}
</style>
