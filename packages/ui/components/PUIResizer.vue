<template>
  <div
    @mousedown="handler"
    @touchstart="handler"
    class="pui-resizer"
    :class="[`pui-resizer-${props.side}`, { 'pui-resizer-active': isActive }]"
    :style="{ '--pui-size': size }"
  >
    <span class="pui-resizer-handle">
      <Icon v-if="side === 'left' || side === 'right'" mode="svg" name="tabler:grip-vertical" />
      <Icon v-else mode="svg" name="tabler:grip-horizontal" />
    </span>
  </div>
</template>

<script lang="ts" setup>
import { clamp, clearArray, isDefined, isUndefined } from '@pruvious/utils'
import { onKeyStroke, useEventListener } from '@vueuse/core'

const props = defineProps({
  /**
   * The width or height of an element where the resizer is applied.
   */
  modelValue: {
    type: Number,
    required: true,
  },

  /**
   * The side of the element where the resizer is applied.
   *
   * @default 'horizontal'
   */
  side: {
    type: String as PropType<'top' | 'right' | 'bottom' | 'left'>,
    default: 'bottom',
  },

  /**
   * The minimum `modelValue`.
   *
   * @default 0
   */
  min: {
    type: Number,
    default: 0,
  },

  /**
   * The maximum `modelValue`.
   *
   * By default, no maximum is set.
   */
  max: {
    type: Number,
  },

  /**
   * The number of pixels to resize by in each step.
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
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'commit': [value: number]
}>()

const isActive = ref(false)
const dragEventListeners: (() => void)[] = []

let tmp = props.modelValue

function handler(event: MouseEvent | TouchEvent) {
  event.preventDefault()

  const direction = props.side === 'top' || props.side === 'bottom' ? 'vertical' : 'horizontal'
  const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0]?.clientX
  const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0]?.clientY

  if (isUndefined(clientX) || isUndefined(clientY)) {
    return
  }

  isActive.value = true

  let prev = direction === 'horizontal' ? clientX : clientY
  let multiplier = 1

  const onMouseMove = (event: MouseEvent | TouchEvent) => {
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0]?.clientX
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0]?.clientY

    if (isDefined(clientX) && isDefined(clientY)) {
      const current = direction === 'horizontal' ? clientX : clientY
      const delta = props.side === 'top' || props.side === 'left' ? prev - current : current - prev
      const deltaRounded = delta < 0 ? Math.floor(delta) : Math.ceil(delta)
      prev = current
      tmp = clamp(props.modelValue + deltaRounded * props.increment * multiplier, props.min, props.max ?? Infinity)
      emit('update:modelValue', tmp)
    }
  }

  dragEventListeners.push(
    useEventListener(document, 'mousemove', onMouseMove),
    useEventListener(document, 'touchmove', onMouseMove),
    useEventListener(document, 'mouseup', stopDragging),
    useEventListener(document, 'touchend', stopDragging),
    onKeyStroke('Escape', stopDragging),
  )
}

/**
 * Stops all event listeners related to dragging.
 */
function stopDragging() {
  dragEventListeners.forEach((stop) => stop())
  isActive.value = false
  clearArray(dragEventListeners)
  emit('commit', tmp)
}
</script>

<style>
.pui-resizer {
  position: absolute;
  z-index: var(--pui-z, 1);
  background-color: transparent;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-resizer-top,
.pui-resizer-bottom {
  right: 0;
  left: 0;
  width: 100%;
  height: 6px;
  cursor: ns-resize;
}

.pui-resizer-left,
.pui-resizer-right {
  top: 0;
  bottom: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
}

.pui-resizer-top {
  top: -3px;
}

.pui-resizer-right {
  right: -3px;
}

.pui-resizer-bottom {
  bottom: -3px;
}

.pui-resizer-left {
  left: -3px;
}

.pui-resizer-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: hsl(var(--pui-primary));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  color: hsl(var(--pui-primary-foreground));
  opacity: 0;
  visibility: hidden;
  transform: translate3d(-50%, -50%, 0) scale(0.88);
  transition: var(--pui-transition);
  transition-property: opacity, visibility, transform;
}

.pui-resizer-top .pui-resizer-handle,
.pui-resizer-bottom .pui-resizer-handle {
  width: 1.5em;
  height: 1em;
}

.pui-resizer-left .pui-resizer-handle,
.pui-resizer-right .pui-resizer-handle {
  width: 1em;
  height: 1.5em;
}

.pui-resizer:hover .pui-resizer-handle,
.pui-resizer-active .pui-resizer-handle {
  opacity: 1;
  visibility: visible;
  transform: translate3d(-50%, -50%, 0) scale(1);
}
</style>
