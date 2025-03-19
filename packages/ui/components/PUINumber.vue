<template>
  <div
    @dblclick.stop
    class="pui-number"
    :class="{
      'pui-number-has-drag-button': showDragButton,
      'pui-number-has-errors': error,
      'pui-number-disabled': disabled,
    }"
    :style="{ '--pui-size': size }"
  >
    <button
      v-if="showDragButton"
      :aria-label="ariaDragLabel"
      :disabled="disabled"
      @mousedown="handleDrag"
      @touchstart="handleDrag"
      tabindex="-1"
      type="button"
      class="pui-number-icon"
      :class="[`pui-number-icon-${dragDirection}`]"
    >
      <Icon v-if="dragDirection === 'horizontal'" mode="svg" name="tabler:arrows-horizontal" class="pui-stroke-2" />
      <Icon v-else mode="svg" name="tabler:arrows-vertical" class="pui-stroke-2" />
    </button>

    <input
      v-model="stringified"
      :disabled="disabled"
      :id="id"
      :name="name"
      :placeholder="placeholder"
      @blur="onBlur()"
      @input="maybeEmit()"
      @keydown.down.prevent.stop="(add($event.shiftKey ? -10 * increment : -increment), normalize(), maybeEmit(true))"
      @keydown.up.prevent.stop="(add($event.shiftKey ? 10 * increment : increment), normalize(), maybeEmit(true))"
      type="text"
      class="pui-number-input"
      :style="{ width: autoWidth ? `${inputWidth}px` : undefined }"
    />

    <span v-if="autoWidth" ref="inputShadow" class="pui-number-input pui-number-input-shadow">
      {{ stringified || placeholder }}
    </span>

    <span v-if="showSteppers" class="pui-number-steppers">
      <button
        :disabled="max !== undefined && modelValue >= max"
        @click="(add($event.shiftKey ? 10 * increment : increment), normalize(), maybeEmit(true))"
        tabindex="-1"
        type="button"
        class="pui-raw"
      >
        <Icon mode="svg" name="tabler:chevron-up" />
      </button>
      <button
        :disabled="min !== undefined && modelValue <= min"
        @click="(add($event.shiftKey ? -10 * increment : -increment), normalize(), maybeEmit(true))"
        tabindex="-1"
        type="button"
        class="pui-raw"
      >
        <Icon mode="svg" name="tabler:chevron-down" />
      </button>
    </span>

    <span v-if="suffix" class="pui-number-suffix">{{ suffix }}</span>
  </div>
</template>

<script lang="ts" setup>
import { clearArray, isDefined, isRealNumber, isUndefined } from '@pruvious/utils'
import { onKeyDown, onKeyStroke, onKeyUp, useElementBounding, useEventListener } from '@vueuse/core'

const props = defineProps({
  /**
   * The value of the input field.
   */
  modelValue: {
    type: Number,
    required: true,
  },

  /**
   * The minimum value that the input can have.
   *
   * By default, there is no minimum value.
   */
  min: {
    type: Number,
  },

  /**
   * The maximum value that the input can have.
   *
   * By default, there is no maximum value.
   */
  max: {
    type: Number,
  },

  /**
   * The number of decimal places that the input can have.
   *
   * @default 0
   */
  decimals: {
    type: Number,
    default: 0,
  },

  /**
   * The amount to increment the input value when using the arrow keys or dragging the icon.
   *
   * @default 1
   */
  increment: {
    type: Number,
    default: 1,
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
   * An optional placeholder text to display when the input is empty.
   */
  placeholder: {
    type: String,
  },

  /**
   * An optional suffix to display after the input value.
   */
  suffix: {
    type: String,
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
   * Specifies whether the input should automatically get the width of its content.
   *
   * @default false
   */
  autoWidth: {
    type: Boolean,
    default: false,
  },

  /**
   * Controls the visibility of the drag button element.
   * When enabled, users can interact with this button to adjust values.
   *
   * @default false
   */
  showDragButton: {
    type: Boolean,
    default: false,
  },

  /**
   * Controls the visibility of the stepper buttons.
   * When enabled, users can interact with these buttons to adjust values.
   *
   * @default false
   */
  showSteppers: {
    type: Boolean,
    default: false,
  },

  /**
   * Defines the axis along which the drag button can be moved.
   * The movement direction affects how the input value changes.
   *
   * @default 'horizontal'
   */
  dragDirection: {
    type: String as PropType<'horizontal' | 'vertical'>,
    default: 'horizontal',
  },

  /**
   * Specifies the accessibility label for the drag button.
   * This text is read by screen readers to describe the button's function.
   *
   * @default 'Drag to adjust'
   */
  ariaDragLabel: {
    type: String,
    default: 'Drag to adjust',
  },
})

const emit = defineEmits<{
  'commit': [value: number]
  'update:modelValue': [value: number]
}>()

const stringified = ref('')
const inputShadow = useTemplateRef('inputShadow')
const { width: inputWidth } = useElementBounding(inputShadow)
const dragEventListeners: (() => void)[] = []

/**
 * Updates the `stringified` value when the `modelValue` changes.
 */
watch(
  () => props.modelValue,
  (newValue) => {
    stringified.value = newValue.toString()
  },
  { immediate: true },
)

/**
 * Emits the `update:modelValue` event with the input value if it is a valid number.
 */
function maybeEmit(commit = false) {
  if (stringified.value.trim() && isRealNumber(+stringified.value)) {
    emit('update:modelValue', +stringified.value)

    if (commit) {
      emit('commit', +stringified.value)
    }
  }
}

/**
 * Normalizes the input value to a valid number.
 *
 * @returns `true` if the value was normalized, `false` otherwise.
 */
function normalize() {
  let value = getNumericValue()

  if (stringified.value.trim() && isRealNumber(value)) {
    if (isDefined(props.min)) {
      value = Math.max(value, props.min)
    }

    if (isDefined(props.max)) {
      value = Math.min(value, props.max)
    }

    stringified.value = (Math.round(value * 10 ** props.decimals) / 10 ** props.decimals).toString()
    return true
  }

  return false
}

/**
 * Returns the numeric value of the input.
 */
function getNumericValue() {
  return /[0-9,\. ]/.test(stringified.value)
    ? +stringified.value.replace(',', '.').replace(/ +/g, '')
    : +stringified.value
}

/**
 * Adds the given amount to the input value.
 *
 * @param amount The amount to add.
 */
function add(amount: number) {
  const value = getNumericValue()

  if (isRealNumber(value)) {
    stringified.value = (value + amount).toString()
  }
}

/**
 * Handles the `blur` event of the input element.
 */
function onBlur() {
  if (normalize()) {
    maybeEmit(true)
  } else {
    stringified.value = props.modelValue.toString()
  }
}

/**
 * Handles the dragging of the icon to control the input value.
 */
function handleDrag(event: MouseEvent | TouchEvent) {
  const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0]?.clientX
  const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0]?.clientY

  if (isUndefined(clientX) || isUndefined(clientY)) {
    return
  }

  let prev = props.dragDirection === 'horizontal' ? clientX : clientY
  let multiplier = 1

  const onMouseMove = (event: MouseEvent | TouchEvent) => {
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0]?.clientX
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0]?.clientY

    if (isDefined(clientX) && isDefined(clientY)) {
      const current = props.dragDirection === 'horizontal' ? clientX : clientY
      const delta = props.dragDirection === 'horizontal' ? current - prev : prev - current
      const deltaRounded = delta < 0 ? Math.floor(delta) : Math.ceil(delta)
      prev = current

      add(deltaRounded * props.increment * multiplier)
      normalize()
      maybeEmit()
    }
  }

  dragEventListeners.push(
    useEventListener(document, 'mousemove', onMouseMove),
    useEventListener(document, 'touchmove', onMouseMove),
    useEventListener(document, 'mouseup', stopDragging),
    useEventListener(document, 'touchend', stopDragging),
    onKeyStroke('Escape', stopDragging),
    onKeyDown('Shift', () => (multiplier = 10)),
    onKeyUp('Shift', () => (multiplier = 1)),
  )
}

/**
 * Stops all event listeners related to dragging.
 */
function stopDragging() {
  dragEventListeners.forEach((stop) => stop())
  clearArray(dragEventListeners)
  normalize()
  maybeEmit(true)
}
</script>

<style>
.pui-number {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: calc(2em + 0.25rem);
  overflow: hidden;
  background-color: hsl(var(--pui-card));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.pui-number:focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.pui-number-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-number-disabled {
  box-shadow: none;
  opacity: 0.5;
}

.pui-number-icon {
  position: absolute;
  top: 50%;
  left: 0.5em;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 1em;
  height: 1em;
  margin-top: -0.5em;
  overflow: hidden;
  outline: none;
  color: hsl(var(--pui-foreground));
}

.pui-number-disabled .pui-number-icon {
  pointer-events: none;
}

.pui-number-icon-horizontal {
  cursor: ew-resize;
}

.pui-number-icon-vertical {
  cursor: ns-resize;
}

.pui-number-disabled .pui-number-icon {
  cursor: default;
}

.pui-number-input {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 0 0.5em;
  overflow: hidden;
  background-color: transparent;
  border: none;
  outline: none;
  font-size: 1em;
  line-height: 1.25;
  color: hsl(var(--pui-foreground));
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-number-has-drag-button .pui-number-input {
  padding-left: 2em;
}

.pui-number-input::placeholder {
  color: hsl(var(--pui-muted-foreground));
}

.pui-number-input-shadow {
  position: absolute;
  bottom: 0;
  left: 0;
  display: inline-flex;
  width: auto;
  height: 0;
  padding-top: 0;
  padding-bottom: 0;
  white-space: pre;
  visibility: invisible;
}

.pui-number-steppers {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  margin-right: 0.5em;
  font-size: calc(1em - 0.125rem);
}

.pui-number-disabled .pui-number-steppers {
  pointer-events: none;
}

.pui-number-steppers > button:disabled {
  color: hsl(var(--pui-muted-foreground) / 0.64);
}

.pui-number-suffix {
  flex-shrink: 0;
  margin-right: 0.5em;
  color: hsl(var(--pui-muted-foreground));
  font-size: calc(0.875rem + var(--pui-size) * 0.125rem);
  white-space: nowrap;
}
</style>
