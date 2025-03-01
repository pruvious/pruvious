<template>
  <div
    @mousewheel="stopStepScroll()"
    ref="root"
    class="pui-scrollable"
    :class="{ 'pui-scrollable-is-animating': isAnimating }"
    :style="{ '--pui-size': size }"
  >
    <div
      @mouseenter="!($event as any).sourceCapabilities?.firesTouchEvents && $event && startStepScroll('up')"
      @mouseleave="stopStepScroll()"
      class="pui-scrollable-button"
      :class="{ 'pui-scrollable-button-visible': isTopButtonVisible }"
    >
      <Icon mode="svg" name="tabler:chevron-up" />
    </div>

    <div
      class="pui-scrollable-content"
      :class="{
        'pui-scrollable-content-not-top': isTopButtonVisible,
        'pui-scrollable-content-not-bottom': isBottomButtonVisible,
      }"
    >
      <slot />
    </div>

    <div
      @mouseenter="!($event as any).sourceCapabilities?.firesTouchEvents && $event && startStepScroll('down')"
      @mouseleave="stopStepScroll()"
      class="pui-scrollable-button"
      :class="{ 'pui-scrollable-button-visible': isBottomButtonVisible }"
    >
      <Icon mode="svg" name="tabler:chevron-down" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useDebounceFn, useElementSize, useScroll, useScrollLock } from '@vueuse/core'

const props = defineProps({
  /**
   * Enables automatic content scrolling when the mouse hovers over the scroll buttons at the top or bottom.
   * The value specifies the number of pixels to scroll.
   * When set to `0`, automatic scrolling is disabled.
   *
   * @default 0
   */
  autoScroll: {
    type: Number,
    default: 0,
  },

  /**
   * The interval in milliseconds between each step when scrolling the content.
   *
   * @default 50
   */
  stepInterval: {
    type: Number,
    default: 50,
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
  scrollStep: [direction: 'up' | 'down']
}>()

const root = useTemplateRef('root')
const { height } = useElementSize(root)
const scroll = useScroll(root)
const isLocked = useScrollLock(root)
const isTopButtonVisible = ref(false)
const isBottomButtonVisible = ref(false)
const isAnimating = ref(false)
const isStepScrolling = ref(false)

let scrollInterval: ReturnType<typeof setInterval> | undefined

defineExpose({
  scroll,
  isLocked,
  isTopButtonVisible,
  isBottomButtonVisible,
})

watch(height, () => {
  isTopButtonVisible.value = false
  isBottomButtonVisible.value = false
  isAnimating.value = true
  updateDebounced()
})

watch(scroll.arrivedState, update)

/**
 * Update the visibility of the top and bottom buttons.
 */
function update() {
  scroll.measure()
  isTopButtonVisible.value = !scroll.arrivedState.top
  isBottomButtonVisible.value = !scroll.arrivedState.bottom
  isAnimating.value = false
}

const updateDebounced = useDebounceFn(update, 30)

/**
 * Starts scrolling the content at a specified `stepInterval` in milliseconds and in the chosen direction.
 */
function startStepScroll(direction: 'up' | 'down') {
  isStepScrolling.value = true
  emit('scrollStep', direction)
  handleAutoScroll(direction)
  scrollInterval = setInterval(() => {
    emit('scrollStep', direction)
    handleAutoScroll(direction)
  }, props.stepInterval)
}

/**
 * Stops scrolling initiated by `startStepScroll`.
 */
function stopStepScroll() {
  isStepScrolling.value = false
  clearInterval(scrollInterval)
}

function handleAutoScroll(direction: 'up' | 'down') {
  if (props.autoScroll) {
    const scrollTop = root.value!.scrollTop ?? 0
    root.value!.scrollTo({
      top: scrollTop + (direction === 'up' ? -props.autoScroll : props.autoScroll),
      behavior: 'instant',
    })
  }
}

onUnmounted(() => {
  stopStepScroll()
})
</script>

<style>
.pui-scrollable {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  line-height: 1.25;
}

.pui-scrollable-button {
  flex-shrink: 0;
  position: sticky;
  z-index: 11;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 0;
  overflow: hidden;
  cursor: default;
  background-color: hsl(var(--pui-background));
  color: hsl(var(--pui-foreground));
}

.pui-scrollable:not(.pui-scrollable-is-animating) .pui-scrollable-button {
  transition: var(--pui-transition);
  transition-property: transform;
}

.pui-scrollable-button:first-child {
  top: 0;
  transform: translateY(-100%);
}

.pui-scrollable-button:last-child {
  bottom: 0;
  transform: translateY(100%);
}

.pui-scrollable-button-visible:first-child,
.pui-scrollable-button-visible:last-child {
  height: 1em;
  transform: translate3d(0, 0, 0);
}

.pui-scrollable-content {
  flex: 1;
}

.pui-scrollable-content-not-top {
  margin-top: -1em;
}

.pui-scrollable-content-not-bottom {
  margin-bottom: -1em;
}
</style>
