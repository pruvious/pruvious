<template>
  <div ref="containerRef" class="p-progress-circle-container">
    <svg
      v-if="containerSize > 0"
      :height="containerSize"
      :viewBox="`0 0 ${containerSize} ${containerSize}`"
      :width="containerSize"
      class="p-progress-circle-svg"
    >
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke="bgColor"
        :stroke-width="strokeWidth"
        fill="none"
        class="p-progress-circle-bg"
      />
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke="progressColor"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        :stroke-width="strokeWidth"
        fill="none"
        class="p-progress-circle-bar"
      />
    </svg>
    <div class="p-progress-circle-text" :style="{ fontSize: `${containerSize / 4}px` }">
      {{ Math.round(progress) }}%
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /**
   * The current progress percentage (0-100).
   */
  progress: {
    type: Number,
    required: true,
    validator: (value) => value >= 0 && value <= 100,
  },

  /**
   * The width of the circle's stroke in pixels.
   *
   * @default 3
   */
  strokeWidth: {
    type: Number,
    default: 3,
  },

  /**
   * The color of the background track of the circle.
   *
   * @default 'transparent'
   */
  bgColor: {
    type: String,
    default: 'transparent',
  },

  /**
   * The color of the animated progress bar.
   *
   * @default 'currentColor'
   */
  progressColor: {
    type: String,
    default: 'currentColor',
  },
})

const containerRef = ref(null)
const containerSize = ref(0)
const center = computed(() => containerSize.value / 2)
const radius = computed(() => center.value - props.strokeWidth / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const offset = computed(() => circumference.value - (props.progress / 100) * circumference.value)

let resizeObserver

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      const { width, height } = entry.contentRect
      containerSize.value = Math.min(width, height)
    })

    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<style scoped>
.p-progress-circle-container {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.p-progress-circle-svg {
  max-width: 100%;
  max-height: 100%;
  transform: rotate(-90deg);
}

.p-progress-circle-bar {
  stroke-linecap: round;
  transition-property: stroke-dashoffset;
  transition: var(--pui-transition);
}

.p-progress-circle-text {
  position: absolute;
  color: currentColor;
  font-weight: 600;
}
</style>
