<template>
  <div class="pui-calendar-range" :class="`pui-calendar-range-decorator-${decorator}`" :style="{ '--pui-size': size }">
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
import { isNull, isNumber } from '@pruvious/utils'
import { puiParseDateTime, puiParseTimeSpan } from '../pui/date'
import type { PUITimezone } from '../pui/timezone'
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
   * Sets the initial year and month shown when the calendar opens.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   * - String - ISO 8601 formatted date.
   *
   * If not specified, the calendar will try to use the current `modelValue`.
   * If `modelValue` is `null`, it defaults to the current year and month.
   *
   * @default null
   */
  initial: {
    type: [Number, String, null],
    default: null,
  },

  /**
   * Specifies whether the calendars should include time selection.
   *
   * When disabled, all timestamps are set to midnight.
   * The `timezone` prop is used to resolve the midnight time.
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
   * The time zone identifier for displaying date values in the calendar.
   * The value must be a valid IANA time zone name or `local`.
   *
   * @default 'UTC'
   *
   * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List
   * @see https://www.iana.org/time-zones
   *
   * @example
   * ```ts
   * 'local'
   * 'Europe/Berlin'
   * 'America/New_York'
   * 'Asia/Tokyo'
   * ```
   */
  timezone: {
    type: String as PropType<PUITimezone | 'local'>,
    default: 'UTC',
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
   * Controls the visibility of the clear button in the calendar input.
   * When set to `false`, users cannot remove their date selection.
   *
   * @default true
   */
  clearable: {
    type: Boolean,
    default: true,
  },

  /**
   * The icon to display in the first calendar input.
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
   * @default 'calendar-down'
   */
  iconFrom: {
    type: [String, Object, null] as PropType<keyof typeof icons | VNode | null>,
    default: 'calendar-down',
  },

  /**
   * The icon to display in the second calendar input.
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
   * @default 'calendar-up'
   */
  iconTo: {
    type: [String, Object, null] as PropType<keyof typeof icons | VNode | null>,
    default: 'calendar-up',
  },

  /**
   * The minimum selectable date.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted date.
   *   - Parsed through `Date.parse()`.
   *
   * When not specified, defaults to January 1st, 100 CE (0100-01-01T00:00:00.000Z).
   *
   * @default -59011459200000
   *
   * @example
   * ```ts
   * new Date('2024-12-15').getTime()
   * '2024-12-15T00:00:00.000Z'
   * '2024'
   * ```
   */
  min: {
    type: [Number, String],
    default: -59011459200000,
  },

  /**
   * The maximum selectable date.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted date.
   *   - Parsed through `Date.parse()`.
   *
   * When not specified, defaults to the latest possible date in JavaScript.
   *
   * @default 8640000000000000
   *
   * @example
   * ```ts
   * new Date('2077-06-06').getTime()
   * '2077-06-06T00:00:00.000Z'
   * '2077'
   * ```
   */
  max: {
    type: [Number, String],
    default: 8640000000000000,
  },

  /**
   * Minimum time span between start and end dates.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - Duration string (e.g., '1 hour', '30 minutes').
   *   - Parsed using the [`jose`](https://github.com/panva/jose/blob/main/src/lib/secs.ts) library.
   * - Object - Object with `days`, `hours`, `minutes`, and `seconds` properties.
   *
   * By default, start and end times can be identical (zero time difference).
   *
   * @default 0
   */
  minRange: {
    type: [Number, String, Object] as PropType<
      number | string | { days?: number; hours?: number; minutes?: number; seconds?: number }
    >,
    default: 0,
  },

  /**
   * Maximum time span between start and end dates.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - Duration string (e.g., '1 day', '4 hours').
   *   - Parsed using the [`jose`](https://github.com/panva/jose/blob/main/src/lib/secs.ts) library.
   * - Object - Object with `days`, `hours`, `minutes`, and `seconds` properties.
   * - null - No maximum range limit.
   *
   * When specified, prevents selection of date ranges exceeding this duration.
   *
   * @default null
   */
  maxRange: {
    type: [Number, String, Object, null] as PropType<
      number | string | { days?: number; hours?: number; minutes?: number; seconds?: number } | null
    >,
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

  /**
   * The position of the decorator that connects the two calendar inputs.
   * It can be `left`, `right`, or `hidden`.
   *
   * @default 'left'
   */
  decorator: {
    type: String as PropType<'left' | 'right' | 'hidden'>,
    default: 'left',
  },
})

defineEmits<{
  'commit': [value: [number | null, number | null]]
  'update:modelValue': [value: [number | null, number | null]]
}>()

const min = computed(() => puiParseDateTime(props.min))
const max = computed(() => puiParseDateTime(props.max))
const minRange = computed(() => puiParseTimeSpan(props.minRange))
const maxRange = computed(() => (isNull(props.maxRange) ? null : puiParseTimeSpan(props.maxRange)))
const minFrom = computed(() =>
  isNumber(props.modelValue[1]) && isNumber(maxRange.value)
    ? Math.max(props.modelValue[1] - maxRange.value, min.value)
    : min.value,
)
const maxFrom = computed(() => (props.modelValue[1] ?? max.value) - minRange.value)
const minTo = computed(() => (props.modelValue[0] ?? min.value) + minRange.value)
const maxTo = computed(() =>
  isNumber(props.modelValue[0]) && isNumber(maxRange.value)
    ? Math.min(props.modelValue[0] + maxRange.value, max.value)
    : max.value,
)
</script>

<style>
.pui-calendar-range {
  position: relative;
  width: 100%;
  max-width: 100%;
}

.pui-calendar-range-decorator-left {
  padding-left: 1em;
}

.pui-calendar-range-decorator-right {
  padding-right: 1em;
}

.pui-calendar-range > .pui-calendar:nth-child(2) {
  margin-top: 0.5em;
}

.pui-calendar-range-decorator {
  position: absolute;
  top: calc(1em - 0.03125rem);
  bottom: calc(1em - 0.03125rem);
  width: 0.5em;
  border-width: 1px;
  border-color: hsl(var(--pui-muted-foreground) / 0.36);
}

.pui-calendar-range-decorator-left .pui-calendar-range-decorator {
  left: 0;
  border-right: none;
  border-top-left-radius: calc(var(--pui-radius) - 0.25rem);
  border-bottom-left-radius: calc(var(--pui-radius) - 0.25rem);
}

.pui-calendar-range-decorator-right .pui-calendar-range-decorator {
  right: 0;
  border-left: none;
  border-top-right-radius: calc(var(--pui-radius) - 0.25rem);
  border-bottom-right-radius: calc(var(--pui-radius) - 0.25rem);
}

.pui-calendar-range-decorator-hidden .pui-calendar-range-decorator {
  display: none;
}
</style>
