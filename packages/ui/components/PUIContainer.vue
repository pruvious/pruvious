<template>
  <div @mousewheel="stopScrolling()" ref="root" tabindex="-1" class="pui-container">
    <div
      @mouseenter="startScrolling('up')"
      @mouseleave="stopScrolling()"
      class="pui-container-scroll-button"
      :class="{ 'pui-container-scroll-button-active': draggable && !draggable.touch && isScrollTopButtonActive }"
    ></div>

    <div ref="content" class="pui-container-content">
      <slot />
    </div>

    <div
      @mouseenter="startScrolling('down')"
      @mouseleave="stopScrolling()"
      class="pui-container-scroll-button"
      :class="{ 'pui-container-scroll-button-active': draggable && !draggable.touch && isScrollBottomButtonActive }"
    ></div>
  </div>
</template>

<script lang="ts" setup>
import { useDebounceFn, useElementSize, useScroll } from '@vueuse/core'
import { usePUIStructureDraggable } from '../pui/structure'

const props = defineProps({
  /**
   * Defines the scrolling speed in pixels per second.
   *
   * @default 512
   */
  distance: {
    type: Number,
    default: 512,
  },
})

const draggable = usePUIStructureDraggable()
const root = useTemplateRef('root')
const content = useTemplateRef('content')
const { height } = useElementSize(content)
const scroll = useScroll(root)
const isScrollTopButtonActive = ref(false)
const isScrollBottomButtonActive = ref(false)
const isScrolling = ref(false)

let animationFrame: number | undefined
let prevTime: number | undefined
let scrollDirection: 'up' | 'down' | undefined

defineExpose({ root, content, scroll })

provide('root', root)
provide('content', content)
provide('scroll', scroll)

watch(height, () => {
  isScrollTopButtonActive.value = false
  isScrollBottomButtonActive.value = false
  updateDebounced()
})

watch(scroll.arrivedState, update)

function update() {
  scroll.measure()
  isScrollTopButtonActive.value = !scroll.arrivedState.top
  isScrollBottomButtonActive.value = !scroll.arrivedState.bottom
}

const updateDebounced = useDebounceFn(update, 30)

function startScrolling(direction: 'up' | 'down') {
  isScrolling.value = true
  scrollDirection = direction
  animationFrame = requestAnimationFrame(scrollHandler)
}

function scrollHandler(time: number) {
  if (isScrolling.value && root.value) {
    if (prevTime === undefined) {
      prevTime = time
    }

    const elapsed = time - prevTime
    const distance = (elapsed / 1000) * props.distance

    if (scrollDirection === 'up') {
      root.value.scrollTop -= distance
    } else {
      root.value.scrollTop += distance
    }

    prevTime = time
    animationFrame = requestAnimationFrame(scrollHandler)
  }
}

function stopScrolling() {
  isScrolling.value = false
  prevTime = undefined
  scrollDirection = undefined

  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
}

onUnmounted(() => {
  stopScrolling()
})
</script>

<style>
.pui-container {
  display: flex;
  flex-direction: column;
  outline: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--pui-foreground) / 0.25) transparent;
}

.pui-container-scroll-button {
  flex-shrink: 0;
  position: sticky;
  z-index: 21;
  height: 1.5rem;
  cursor: default;
  visibility: hidden;
}

.pui-container-scroll-button-active {
  visibility: visible;
}

.pui-container-scroll-button:first-child {
  top: 0;
  margin-bottom: -1.5rem;
}

.pui-container-scroll-button:last-child {
  bottom: 0;
  margin-top: -1.5rem;
}

.pui-container-content {
  flex: 1;
}
</style>
