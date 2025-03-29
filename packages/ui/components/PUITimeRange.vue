<template>
  <div class="pui-time-range" :style="{ '--pui-size': size }">
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
import { isDefined } from '@pruvious/utils'
import type { PUITimeLabels } from './PUITime.vue'

const props = defineProps({
  /**
   * The value of the time range field.
   * It must be a tuple of integers between `0` (00:00:00) and `86399` (23:59:59).
   * The integers represent the start and end of the range in seconds.
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
   * The minimum allowed time for both inputs.
   * The value must be specified in seconds (e.g., `3600` for 01:00:00).
   *
   * @default 0
   */
  min: {
    type: Number,
    default: 0,
  },

  /**
   * The maximum allowed time for both inputs.
   * The value must be specified in seconds (e.g., `7200` for 02:00:00).
   *
   * @default 86399
   */
  max: {
    type: Number,
    default: 86399,
  },

  /**
   * The minimum range of the time range in seconds.
   * By default, both time values can be the same.
   *
   * @default 0
   */
  minRange: {
    type: Number,
    default: 0,
  },

  /**
   * The maximum range of the time range in seconds.
   * By default, the maximum range is 86399 seconds (23:59:59).
   *
   * @default 86399
   */
  maxRange: {
    type: Number,
    default: 86399,
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
})

defineEmits<{
  'commit': [value: [number, number]]
  'update:modelValue': [value: [number, number]]
}>()

const minFrom = computed(() => {
  let minValue = props.min
  if (isDefined(props.modelValue[1])) {
    const minBasedOnMaxRange = props.modelValue[1] - props.maxRange
    if (minBasedOnMaxRange > minValue) {
      minValue = minBasedOnMaxRange
    }
  }
  return Math.min(minValue, props.max)
})
const maxFrom = computed(() => {
  let maxValue = props.max
  if (isDefined(props.modelValue[1])) {
    const maxBasedOnMinRange = props.modelValue[1] - props.minRange
    if (maxBasedOnMinRange < maxValue) {
      maxValue = maxBasedOnMinRange
    }
  }
  return Math.max(maxValue, props.min)
})
const minTo = computed(() => {
  let minValue = props.min
  if (isDefined(props.modelValue[0])) {
    const minBasedOnMinRange = props.modelValue[0] + props.minRange
    if (minBasedOnMinRange > minValue) {
      minValue = minBasedOnMinRange
    }
  }
  return Math.min(minValue, props.max)
})

const maxTo = computed(() => {
  let maxValue = props.max
  if (isDefined(props.modelValue[0])) {
    const maxBasedOnMaxRange = props.modelValue[0] + props.maxRange
    if (maxBasedOnMaxRange < maxValue) {
      maxValue = maxBasedOnMaxRange
    }
  }
  return Math.max(maxValue, props.min)
})
</script>

<style>
.pui-time-range {
  position: relative;
  width: 100%;
  max-width: 100%;
  padding-left: 1em;
}

.pui-time-range > .pui-time:nth-child(2) {
  margin-top: 0.5em;
}

.pui-time-range-decorator {
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
