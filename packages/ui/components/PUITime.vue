<template>
  <div
    ref="root"
    class="pui-time"
    :class="{
      'pui-time-has-errors': error,
      'pui-time-disabled': disabled,
    }"
    :style="{ '--pui-size': size }"
  >
    <div class="pui-time-inner">
      <PUINumber
        :disabled="disabled"
        :error="error"
        :id="`${id}--hours`"
        :max="maxHours"
        :min="minHours"
        :modelValue="hours"
        :name="name ? `${name}--hours` : undefined"
        :padZeros="2"
        :suffix="labels?.hoursSuffix ?? 'h'"
        @commit="$emit('commit', toModelValue($event, minutes, seconds))"
        @update:modelValue="$emit('update:modelValue', toModelValue($event, minutes, seconds))"
        showSteppers
      />

      <span>:</span>

      <PUINumber
        :disabled="disabled"
        :error="error"
        :id="`${id}--minutes`"
        :max="maxMinutes"
        :min="minMinutes"
        :modelValue="minutes"
        :name="name ? `${name}--minutes` : undefined"
        :padZeros="2"
        :suffix="labels?.minutesSuffix ?? 'm'"
        @commit="$emit('commit', toModelValue(hours, $event, seconds))"
        @update:modelValue="$emit('update:modelValue', toModelValue(hours, $event, seconds))"
        showSteppers
      />

      <span v-if="showSeconds">:</span>

      <PUINumber
        v-if="showSeconds"
        :disabled="disabled"
        :error="error"
        :id="`${id}--seconds`"
        :max="maxSeconds"
        :min="minSeconds"
        :modelValue="seconds"
        :name="name ? `${name}--seconds` : undefined"
        :padZeros="2"
        :suffix="labels?.secondsSuffix ?? 's'"
        @commit="$emit('commit', toModelValue(hours, minutes, $event))"
        @update:modelValue="$emit('update:modelValue', toModelValue(hours, minutes, $event))"
        showSteppers
      />
    </div>

    <input :id="id" :name="name" :value="modelValue" hidden />
  </div>
</template>

<script lang="ts" setup>
import { clamp } from '@pruvious/utils'

export interface PUITimeLabels {
  /**
   * The suffix to display after the hours input.
   *
   * @default 'h'
   */
  hoursSuffix?: string

  /**
   * The suffix to display after the minutes input.
   *
   * @default 'm'
   */
  minutesSuffix?: string

  /**
   * The suffix to display after the seconds input.
   *
   * @default 's'
   */
  secondsSuffix?: string
}

const props = defineProps({
  /**
   * The value of the time field in milliseconds.
   * It must be an integer between `0` (00:00:00) and `86399000` (23:59:59).
   */
  modelValue: {
    type: Number,
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
   * Indicates whether the input has errors.
   *
   * @default false
   */
  error: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the input is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * Defines a unique identifier (ID) which must be unique in the whole document.
   * Its purpose is to identify the element when linking (using a fragment identifier), scripting, or styling (with CSS).
   */
  id: {
    type: String,
  },

  /**
   * The `name` attribute of the input element that holds the selected value.
   */
  name: {
    type: String,
  },

  /**
   * Specifies whether to show the seconds input.
   *
   * @default true
   */
  showSeconds: {
    type: Boolean,
    default: true,
  },

  /**
   * Labels used for the time picker component.
   */
  labels: {
    type: Object as PropType<PUITimeLabels>,
  },
})

defineEmits<{
  'commit': [value: number]
  'update:modelValue': [value: number]
}>()

const { listen } = puiTrigger()
const root = useTemplateRef('root')
const min = computed(() => puiParseTime(props.min))
const max = computed(() => puiParseTime(props.max))
const hours = computed(() => Math.floor(props.modelValue / 1000 / 3600))
const minutes = computed(() => Math.floor(((props.modelValue / 1000) % 3600) / 60))
const seconds = computed(() => Math.floor((props.modelValue / 1000) % 60))
const minHours = computed(() => Math.floor(min.value / 1000 / 3600))
const maxHours = computed(() => Math.floor(max.value / 1000 / 3600))
const minMinutes = computed(() => {
  if (hours.value > minHours.value) return 0
  if (hours.value < minHours.value) return 0
  return Math.floor(((min.value / 1000) % 3600) / 60)
})
const maxMinutes = computed(() => {
  if (hours.value < maxHours.value) return 59
  if (hours.value > maxHours.value) return 0
  return Math.floor(((max.value / 1000) % 3600) / 60)
})
const minSeconds = computed(() => {
  if (hours.value > minHours.value || (hours.value === minHours.value && minutes.value > minMinutes.value)) return 0
  if (hours.value < minHours.value || (hours.value === minHours.value && minutes.value < minMinutes.value)) return 0
  return Math.floor((min.value / 1000) % 60)
})
const maxSeconds = computed(() => {
  if (hours.value < maxHours.value || (hours.value === maxHours.value && minutes.value < maxMinutes.value)) return 59
  if (hours.value > maxHours.value || (hours.value === maxHours.value && minutes.value > maxMinutes.value)) return 0
  return Math.floor((max.value / 1000) % 60)
})

let stopFocusListener: (() => void) | undefined

watch(
  () => props.id,
  (id) => {
    if (id) {
      stopFocusListener = listen(`focus:${id}`, () => {
        if (!props.disabled) {
          const input = root.value?.querySelector('.pui-number-input') as HTMLInputElement | null
          input?.focus()
        }
      })
    } else {
      stopFocusListener?.()
    }
  },
  { immediate: true },
)

function toModelValue(hours: number, minutes: number, seconds: number): number {
  return clamp((hours * 3600 + minutes * 60 + seconds) * 1000, min.value, max.value)
}
</script>

<style>
.pui-time {
  width: 100%;
  max-width: 100%;
}

.pui-time-inner {
  display: flex;
  align-items: center;
  gap: 0.25em;
}

.pui-time-inner > span {
  flex-shrink: 0;
  color: hsl(var(--pui-muted-foreground));
}
</style>
