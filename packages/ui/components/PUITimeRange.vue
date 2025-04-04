<template>
  <div class="pui-time-range" :class="`pui-time-range-decorator-${decorator}`" :style="{ '--pui-size': size }">
    <PUITime
      :disabled="disabled"
      :error="error"
      :id="id ? `${id}--1` : undefined"
      :labels="labels"
      :max="maxFrom"
      :min="minFrom"
      :modelValue="modelValue[0]"
      :name="name ? `${name}--1` : undefined"
      :showSeconds="showSeconds"
      @commit="$emit('commit', [$event, modelValue[1]])"
      @update:modelValue="$emit('update:modelValue', [$event, modelValue[1]])"
    />

    <PUITime
      :disabled="disabled"
      :error="error"
      :id="id ? `${id}--2` : undefined"
      :labels="labels"
      :max="maxTo"
      :min="minTo"
      :modelValue="modelValue[1]"
      :name="name ? `${name}--2` : undefined"
      :showSeconds="showSeconds"
      @commit="$emit('commit', [modelValue[0], $event])"
      @update:modelValue="$emit('update:modelValue', [modelValue[0], $event])"
    />

    <span class="pui-time-range-decorator"></span>
  </div>
</template>

<script lang="ts" setup>
import { isNumber } from '@pruvious/utils'
import type { PUITimeLabels } from './PUITime.vue'

const props = defineProps({
  /**
   * The value of the time range field.
   * It must be a tuple of integers between `0` (00:00:00) and `86399000` (23:59:59).
   * The integers represent the start and end of the range in milliseconds.
   */
  modelValue: {
    type: Array as unknown as PropType<[number, number]>,
    required: true,
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
   * The minimum selectable time.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds (e.g., `3600000` for 01:00:00).
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted time.
   *   - Parsed through `Date.parse('1970-01-01T' + time + 'Z')`.
   *
   * When not specified, defaults to 0 milliseconds (00:00:00).
   *
   * @default 0
   *
   * @example
   * ```ts
   * 3600000
   * '01:00:00'
   * '01:00'
   * ```
   */
  min: {
    type: [Number, String],
    default: 0,
  },

  /**
   * The maximum selectable time.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds (e.g., `7200000` for 02:00:00).
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted time.
   *   - Parsed through `Date.parse('1970-01-01T' + time + 'Z')`.
   *
   * When not specified, defaults to 86399000 milliseconds (23:59:59).
   *
   * @default 86399000
   *
   * @example
   * ```ts
   * 7200000
   * '02:00:00'
   * '02:00'
   * ```
   */
  max: {
    type: [Number, String],
    default: 86399000,
  },

  /**
   * Minimum time span between start and end times.
   * Accepts these formats:
   *
   * - Numeric - Timestamp in milliseconds (e.g., `3600000` for 1 hour).
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted time or duration string (e.g., '1 hour', '30 minutes').
   *   - ISO 8601 format is parsed through `Date.parse('1970-01-01T' + time + 'Z')`.
   *   - Duration string is parsed using the [`jose`](https://github.com/panva/jose/blob/main/src/lib/secs.ts) library.
   * - Object - Object with `hours`, `minutes`, and `seconds` properties.
   *
   * By default, start and end times can be identical (zero time difference).
   *
   * @default 0
   */
  minRange: {
    type: [Number, String, Object] as PropType<
      number | string | { hours?: number; minutes?: number; seconds?: number }
    >,
    default: 0,
  },

  /**
   * Maximum time span between start and end times.
   * Accepts these formats:
   *
   * - Numeric - Timestamp in milliseconds (e.g., `7200000` for 2 hours).
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted time or duration string (e.g., '1 hour', '30 minutes').
   *   - ISO 8601 format is parsed through `Date.parse('1970-01-01T' + time + 'Z')`.
   *   - Duration string is parsed using the [`jose`](https://github.com/panva/jose/blob/main/src/lib/secs.ts) library.
   * - Object - Object with `hours`, `minutes`, and `seconds` properties.
   *
   * By default, the maximum range is 86399000 milliseconds (23:59:59).
   *
   * @default 86399000
   */
  maxRange: {
    type: [Number, String, Object] as PropType<
      number | string | { hours?: number; minutes?: number; seconds?: number }
    >,
    default: 86399000,
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
   * Specifies whether to show the seconds inputs.
   *
   * @default true
   */
  showSeconds: {
    type: Boolean,
    default: true,
  },

  /**
   * Labels used for the time picker components.
   */
  labels: {
    type: Object as PropType<PUITimeLabels>,
  },

  /**
   * The position of the decorator that connects the two inputs.
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
  'commit': [value: [number, number]]
  'update:modelValue': [value: [number, number]]
}>()

const min = computed(() => puiParseTime(props.min))
const max = computed(() => puiParseTime(props.max))
const minRange = computed(() => puiParseTimeSpan(props.minRange))
const maxRange = computed(() => puiParseTimeSpan(props.maxRange))
const minFrom = computed(() =>
  isNumber(props.modelValue[1]) && isNumber(maxRange.value)
    ? Math.max(props.modelValue[1] - maxRange.value, min.value)
    : min.value,
)
const maxFrom = computed(() => (isNumber(props.modelValue[1]) ? props.modelValue[1] - minRange.value : max.value))
const minTo = computed(() => (props.modelValue[0] ?? min.value) + minRange.value)
const maxTo = computed(() =>
  isNumber(props.modelValue[0]) && isNumber(maxRange.value)
    ? Math.min(props.modelValue[0] + maxRange.value, max.value)
    : max.value,
)
</script>

<style>
.pui-time-range {
  position: relative;
  width: 100%;
  max-width: 100%;
}

.pui-time-range-decorator-left {
  padding-left: 1em;
}

.pui-time-range-decorator-right {
  padding-right: 1em;
}

.pui-time-range > .pui-time:nth-child(2) {
  margin-top: 0.5em;
}

.pui-time-range > .pui-time:nth-child(2) {
  margin-top: 0.5em;
}

.pui-time-range-decorator {
  position: absolute;
  top: calc(1em - 0.03125rem);
  bottom: calc(1em - 0.03125rem);
  width: 0.5em;
  border-width: 1px;
  border-color: hsl(var(--pui-muted-foreground) / 0.36);
}

.pui-time-range-decorator-left .pui-time-range-decorator {
  left: 0;
  border-right: none;
  border-top-left-radius: calc(var(--pui-radius) - 0.25rem);
  border-bottom-left-radius: calc(var(--pui-radius) - 0.25rem);
}

.pui-time-range-decorator-right .pui-time-range-decorator {
  right: 0;
  border-left: none;
  border-top-right-radius: calc(var(--pui-radius) - 0.25rem);
  border-bottom-right-radius: calc(var(--pui-radius) - 0.25rem);
}

.pui-time-range-decorator-hidden .pui-time-range-decorator {
  display: none;
}
</style>
