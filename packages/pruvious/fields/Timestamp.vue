<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <div class="p-timestamp-row">
      <PUIIconGroup
        v-if="options.ui.picker === 'combo'"
        v-model="picker"
        :choices="[
          {
            value: 'calendar',
            icon: options.ui.calendar?.icon ?? 'calendar-week',
            title: __('pruvious-dashboard', 'Calendar (seconds precision)'),
          },
          {
            value: 'numeric',
            icon: 'forms',
            title: __('pruvious-dashboard', 'Numeric (milliseconds precision)'),
          },
        ]"
        :id="`${id}--toggle`"
        :name="`${path}--toggle`"
        showTooltips
        variant="accent"
      />

      <PUICalendar
        v-if="options.ui.picker === 'calendar' || (options.ui.picker === 'combo' && picker === 'calendar')"
        :clearable="false"
        :disabled="disabled"
        :error="!!error"
        :formatter="formatter"
        :icon="options.ui.calendar?.icon"
        :id="id"
        :initial="initial"
        :labels="labels"
        :max="options.max"
        :min="options.min"
        :modelValue="modelValue"
        :name="path"
        :placeholder="placeholder"
        :showSeconds="options.ui.calendar?.showSeconds"
        :startDay="options.ui.calendar?.startDay"
        :timezone="timezone"
        :withTime="true"
        @commit="$emit('commit', $event!)"
        @update:modelValue="$emit('update:modelValue', $event!)"
      />

      <PUINumber
        v-if="options.ui.picker === 'numeric' || (options.ui.picker === 'combo' && picker === 'numeric')"
        :disabled="disabled"
        :error="!!error"
        :id="id"
        :max="options.max"
        :min="options.min"
        :modelValue="modelValue"
        :name="path"
        :placeholder="placeholder"
        :showSteppers="true"
        @commit="$emit('commit', $event)"
        @update:modelValue="$emit('update:modelValue', $event)"
        suffix="ms"
      />
    </div>

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, maybeTranslate, useLanguage } from '#pruvious/client'
import { dayjsConfig, dayjsLocales, dayjsResolveTimezone } from '#pruvious/client/dayjs'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUICalendarLabels } from '@pruvious/ui/components/PUICalendar.vue'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Number,
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
    type: Object as PropType<SerializableFieldOptions<'timestamp'>>,
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
  'commit': [value: number]
  'update:modelValue': [value: number]
}>()

const id = useId()
const placeholder = maybeTranslate(props.options.ui.placeholder)
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
const timezone = computed(() => dayjsResolveTimezone(props.options.ui.calendar?.timezone))
const now = Date.now()
const initial = computed(() => props.options.ui.calendar?.initial ?? (props.modelValue ? undefined : now))

function formatter(timestamp: number): string {
  const { dayjs, language, dateFormat, timeFormat } = dayjsConfig()
  const timezone = dayjsResolveTimezone(props.options.ui.calendar?.timezone)
  const date = dayjs(timestamp).tz(timezone).locale(language)
  return props.options.ui.relativeTime ? date.tz().fromNow() : date.format(`${dateFormat} ${timeFormat}`)
}
</script>

<style scoped>
.p-timestamp-row {
  display: flex;
  gap: 0.75rem;
}
</style>
