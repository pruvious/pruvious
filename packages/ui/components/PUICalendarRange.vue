<template>
  <div class="pui-calendar-range" :style="{ '--pui-size': size }">
    <PUICalendar
      :clearable="clearable"
      :disabled="disabled"
      :error="error"
      :formatter="formatter"
      :icon="iconFrom"
      :id="id ? `${id}--1` : undefined"
      :initial="initial"
      :labels="labels"
      :max="maxFrom"
      :min="minFrom"
      :modelValue="modelValue[0] ?? null"
      :name="name ? `${name}--1` : undefined"
      :placeholder="placeholderFrom"
      :showSeconds="showSeconds"
      :startDay="startDay"
      :strategy="strategy"
      :timezone="timezone"
      :withTime="withTime"
      @commit="$emit('commit', [$event, modelValue[1]])"
      @update:modelValue="$emit('update:modelValue', [$event, modelValue[1]])"
    />

    <PUICalendar
      :clearable="clearable"
      :disabled="disabled"
      :error="error"
      :formatter="formatter"
      :icon="iconTo"
      :id="id ? `${id}--2` : undefined"
      :initial="initial"
      :labels="labels"
      :max="maxTo"
      :min="minTo"
      :modelValue="modelValue[1]"
      :name="name ? `${name}--2` : undefined"
      :placeholder="placeholderTo"
      :showSeconds="showSeconds"
      :startDay="startDay"
      :strategy="strategy"
      :timezone="timezone"
      :withTime="withTime"
      @commit="$emit('commit', [modelValue[0], $event])"
      @update:modelValue="$emit('update:modelValue', [modelValue[0], $event])"
    />

    <span class="pui-calendar-range-decorator"></span>
  </div>
</template>

<script lang="ts" setup>
import type { icons } from '@iconify-json/tabler/icons.json'
import { isNull } from '@pruvious/utils'
import type { PUICalendarLabels } from './PUICalendar.vue'

const props = defineProps({
  /**
   * The value of the calendar range field.
   * It must be a tuple of timestamps in milliseconds since Unix epoch or `null`.
   * The first value is the start of the range and the second value is the end of the range.
   *
   * Note: Round the values to second precision as milliseconds are not used in the calendar.
   */
  modelValue: {
    type: [Array] as unknown as PropType<[number | null, number | null]>,
    required: true,
  },

  /**
   * Specifies the starting date/time displayed when a calendar opens.
   * It must be a timestamp in milliseconds since Unix epoch or `null`.
   *
   * - When not specified, the selected value is used.
   * - If the selected value is not set, the current date will be used.
   *
   * Note: Round the value to second precision as milliseconds are not used in the calendar.
   *
   * @default null
   */
  initial: {
    type: [Number, null],
    default: null,
  },

  /**
   * Specifies whether the calendars should include time selection.
   *
   * When disabled, all timestamps are set to midnight.
   * The `timezone` is used to resolve the midnight time.
   *
   * @default false
   */
  withTime: {
    type: Boolean,
    default: false,
  },

  /**
   * Specifies whether to show the seconds input in the time pickers.
   *
   * @default true
   */
  showSeconds: {
    type: Boolean,
    default: true,
  },

  /**
   * The time difference in minutes between UTC and local time.
   * You can also use a time zone name (e.g., 'Europe/Berlin') which will automatically handle daylight saving time adjustments.
   *
   * By default, the time zone offset is set to UTC (GMT+0).
   *
   * @default 0
   *
   * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List
   * @see https://www.iana.org/time-zones
   *
   * @example
   * ```ts
   * // GMT+1
   * 60
   *
   * // GMT-5
   * -300
   *
   * // Time zone name
   * 'Europe/Berlin'
   * ```
   */
  timezone: {
    type: [Number, String],
    default: 0,
  },

  /**
   * The formatter function to display the selected values.
   * This function takes a timestamp and converts it to a string representation.
   *
   * @default
   * (timestamp: number) => new Date(timestamp).toUTCString()
   */
  formatter: {
    type: Function as PropType<(timestamp: number) => string>,
    default: (timestamp: number) => new Date(timestamp).toUTCString(),
  },

  /**
   * Adjusts the size of the component.
   *
   * Examples:
   *
   * - -2 (very small)
   * - -1 (small)
   * - 0 (default size)
   * - 1 (large)
   * - 2 (very large)
   *
   * By default, the value is inherited as the CSS variable `--pui-size` from the parent element.
   */
  size: {
    type: Number,
  },

  /**
   * An optional placeholder text to display when the value in the first calendar input is `null`.
   */
  placeholderFrom: {
    type: String,
  },

  /**
   * An optional placeholder text to display when the value in the second calendar input is `null`.
   */
  placeholderTo: {
    type: String,
  },

  /**
   * Specifies whether the inputs are clearable.
   *
   * @default true
   */
  clearable: {
    type: Boolean,
    default: true,
  },

  /**
   * The field icon to display in the first calendar input.
   * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
   *
   * @example
   * ```ts
   * // Tabler icon
   * 'calendar-week'
   *
   * // Nuxt icon
   * h(Icon, { name: 'tabler:calendar-event' })
   * ```
   *
   * @default 'calendar-week'
   */
  iconFrom: {
    type: [String, Object, null] as PropType<keyof typeof icons | VNode | null>,
    default: 'calendar-week',
  },

  /**
   * The field icon to display in the second calendar input.
   * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
   *
   * @example
   * ```ts
   * // Tabler icon
   * 'calendar-week'
   *
   * // Nuxt icon
   * h(Icon, { name: 'tabler:calendar-event' })
   * ```
   *
   * @default 'calendar-week'
   */
  iconTo: {
    type: [String, Object, null] as PropType<keyof typeof icons | VNode | null>,
    default: 'calendar-week',
  },

  /**
   * The minimum allowed timestamp for both calendars.
   * The value must be specified in milliseconds since Unix epoch.
   * The default value represents the earliest possible date in JavaScript.
   *
   * Note: Round the value to second precision as milliseconds are not used in the calendar.
   *
   * @default -8640000000000000
   */
  min: {
    type: Number,
    default: -8640000000000000,
  },

  /**
   * The maximum allowed timestamp for both calendars.
   * The value must be specified in milliseconds since Unix epoch.
   * The default value represents the latest possible date in JavaScript.
   *
   * Note: Round the value to second precision as milliseconds are not used in the calendar.
   *
   * @default 8640000000000000
   */
  max: {
    type: Number,
    default: 8640000000000000,
  },

  /**
   * The minimum allowed time range (difference between the start and end of the range) in milliseconds.
   * By default, both time values can be the same.
   *
   * Note: The value is rounded to second precision as milliseconds are not used in the calendar.
   *
   * @default 0
   */
  minRange: {
    type: Number,
    default: 0,
  },

  /**
   * The maximum allowed time range (difference between the start and end of the range) in milliseconds.
   * By default, no maximum range is set.
   *
   * Note: The value is rounded to second precision as milliseconds are not used in the calendar.
   *
   * @default null
   */
  maxRange: {
    type: [Number, null],
    default: null,
  },

  /**
   * Indicates whether the inputs have errors.
   *
   * @default false
   */
  error: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the inputs are disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * Defines a unique base identifier (ID) which must be unique in the whole document.
   * Its purpose is to identify the element when linking (using a fragment identifier), scripting, or styling (with CSS).
   */
  id: {
    type: String,
  },

  /**
   * The base `name` attribute of the input element that holds the selected value.
   */
  name: {
    type: String,
  },

  /**
   * The starting day of the week for the calendar month.
   *
   * - `0` - Sunday
   * - `1` - Monday
   * - `2` - Tuesday
   * - `3` - Wednesday
   * - `4` - Thursday
   * - `5` - Friday
   * - `6` - Saturday
   *
   * @default 1
   */
  startDay: {
    type: Number,
    default: 1,
  },

  /**
   * Labels used for the calendar components.
   */
  labels: {
    type: Object as PropType<PUICalendarLabels>,
  },

  /**
   * The type of CSS position property to use for the pickers.
   * The `fixed` value is recommended for most cases.
   * The `absolute` value is useful when the picker is inside a scrolling container.
   * You can also `provide('floatingStrategy', 'absolute')` from a parent component to change the default value.
   *
   * @default 'fixed'
   */
  strategy: {
    type: String as PropType<'fixed' | 'absolute'>,
    default: 'fixed',
  },
})

defineEmits<{
  'commit': [value: [number | null, number | null]]
  'update:modelValue': [value: [number | null, number | null]]
}>()

const minFrom = computed(() => {
  let minValue = props.min
  if (!isNull(props.modelValue[1]) && !isNull(props.maxRange)) {
    const minBasedOnMaxRange = props.modelValue[1] - props.maxRange
    if (minBasedOnMaxRange > minValue) {
      minValue = minBasedOnMaxRange
    }
  }
  return Math.min(minValue, props.max)
})
const maxFrom = computed(() => {
  let maxValue = props.max
  if (!isNull(props.modelValue[1])) {
    const maxBasedOnMinRange = props.modelValue[1] - props.minRange
    if (maxBasedOnMinRange < maxValue) {
      maxValue = maxBasedOnMinRange
    }
  }
  return Math.max(maxValue, props.min)
})
const minTo = computed(() => {
  let minValue = props.min
  if (!isNull(props.modelValue[0])) {
    const minBasedOnMinRange = props.modelValue[0] + props.minRange
    if (minBasedOnMinRange > minValue) {
      minValue = minBasedOnMinRange
    }
  }
  return Math.min(minValue, props.max)
})

const maxTo = computed(() => {
  let maxValue = props.max
  if (!isNull(props.modelValue[0]) && !isNull(props.maxRange)) {
    const maxBasedOnMaxRange = props.modelValue[0] + props.maxRange
    if (maxBasedOnMaxRange < maxValue) {
      maxValue = maxBasedOnMaxRange
    }
  }
  return Math.max(maxValue, props.min)
})
</script>

<style>
.pui-calendar-range {
  position: relative;
  width: 100%;
  max-width: 100%;
  padding-left: 1em;
}

.pui-calendar-range > .pui-calendar:nth-child(2) {
  margin-top: 0.5em;
}

.pui-calendar-range-decorator {
  position: absolute;
  top: calc(1em - 0.03125rem);
  bottom: calc(1em - 0.03125rem);
  left: 0;
  width: 0.5em;
  border-width: 1px;
  border-right: none;
  border-color: hsl(var(--pui-muted-foreground) / 0.36);
  border-top-left-radius: calc(var(--pui-radius) - 0.25rem);
  border-bottom-left-radius: calc(var(--pui-radius) - 0.25rem);
}
</style>
