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
   * The value of the time field in seconds.
   * It must be an integer between `0` (00:00:00) and `86399` (23:59:59).
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
   * The minimum allowed time.
   * The value must be specified in seconds (e.g., `3600` for 01:00:00).
   *
   * @default 0
   */
  min: {
    type: Number,
    default: 0,
  },

  /**
   * The maximum allowed time.
   * The value must be specified in seconds (e.g., `7200` for 02:00:00).
   *
   * @default 86399
   */
  max: {
    type: Number,
    default: 86399,
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
const hours = computed(() => Math.floor(props.modelValue / 3600))
const minutes = computed(() => Math.floor((props.modelValue % 3600) / 60))
const seconds = computed(() => props.modelValue % 60)
const minHours = computed(() => Math.floor(props.min / 3600))
const maxHours = computed(() => Math.floor(props.max / 3600))
const minMinutes = computed(() => (hours.value === minHours.value ? Math.floor((props.min % 3600) / 60) : 0))
const maxMinutes = computed(() => (hours.value === maxHours.value ? Math.floor((props.max % 3600) / 60) : 59))
const minSeconds = computed(() =>
  hours.value === minHours.value && minutes.value === minMinutes.value ? props.min % 60 : 0,
)
const maxSeconds = computed(() =>
  hours.value === maxHours.value && minutes.value === maxMinutes.value ? props.max % 60 : 59,
)

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
  return clamp(hours * 3600 + minutes * 60 + seconds, props.min, props.max)
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
