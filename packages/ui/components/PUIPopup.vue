<template>
  <Teleport to="body">
    <div
      @keydown.escape="onEscapeKey"
      @keydown.stop="$emit('keydown', $event)"
      ref="root"
      tabindex="-1"
      class="pui-popup"
      :class="[{ 'pui-popup-visible': visible }, additionalClasses]"
      :style="{ '--pui-size': size }"
    >
      <div @click="$emit('close', close)" class="pui-popup-overlay"></div>
      <div class="pui-popup-container" :style="{ width }">
        <div v-if="$slots.header" class="pui-popup-header">
          <slot :close="close" name="header" />
        </div>

        <div class="pui-popup-content">
          <slot :close="close" />
        </div>

        <div v-if="$slots.footer" class="pui-popup-footer">
          <slot :close="close" name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { sleep } from '@pruvious/utils'
import { useActiveElement, useEventListener } from '@vueuse/core'
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap'

defineProps({
  /**
   * The CSS width of the popup.
   *
   * @default '50rem'
   */
  width: {
    type: String,
    default: '50rem',
  },

  /**
   * Additional classes to apply to the popup element.
   */
  additionalClasses: {
    type: Array as PropType<string[]>,
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
  close: [close: () => Promise<void>]
  keydown: [event: KeyboardEvent]
}>()

const root = useTemplateRef('root')
const activeElement = useActiveElement()
const { activate, deactivate } = useFocusTrap(root, {
  escapeDeactivates: false,
  initialFocus: false,
  returnFocusOnDeactivate: false,
})
const visible = ref(false)
const overlayCounter = usePUIOverlayCounter()

let transitionDuration = 300

defineExpose({ close, focus })

useEventListener('keydown', (event) => emit('keydown', event))

onMounted(() => {
  setTimeout(() => {
    overlayCounter.value++
    document.body.classList.add('pui-overlay-active')
    transitionDuration = parseInt(
      getComputedStyle(document.body).getPropertyValue('--pui-overlay-transition-duration') || '300',
    )
    visible.value = true
    root.value!.focus()
    nextTick(activate)
    setTimeout(() => root.value!.focus())
  })
})

watch(activeElement, () => {
  if (activeElement.value?.nodeName === 'BODY') {
    root.value?.focus()
  }
})

onUnmounted(() => {
  overlayCounter.value--
  if (overlayCounter.value === 0) {
    document.body.classList.remove('pui-overlay-active')
  }
  deactivate()
})

/**
 * Handles the escape key event.
 */
function onEscapeKey(event: KeyboardEvent) {
  setTimeout(() => {
    if (!event.defaultPrevented && !puiIsEditingText()) {
      emit('close', close)
    }
  })
}

/**
 * Closes the popup with a transition.
 *
 * @returns a `Promise` that resolves when the transition is complete.
 */
async function close() {
  if (overlayCounter.value === 1) {
    document.body.classList.remove('pui-overlay-active')
  }
  visible.value = false
  await sleep(transitionDuration)
}

/**
 * Focuses the root element of the popup.
 */
function focus() {
  root.value?.focus()
  setTimeout(() => root.value?.focus(), transitionDuration)
}
</script>

<style>
.pui-popup {
  position: fixed;
  z-index: 100;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  padding: 1rem;
  outline: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--pui-foreground) / 0.25) transparent;
}

.pui-popup-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.64);
  transition: var(--pui-transition);
  transition-duration: var(--pui-overlay-transition-duration);
  transition-property: opacity;
}

.pui-popup:not(.pui-popup-visible) .pui-popup-overlay {
  opacity: 0;
}

.pui-popup-container {
  --pui-background: var(--pui-card);
  --pui-foreground: var(--pui-card-foreground);
  position: relative;
  display: block;
  max-width: 100%;
  margin: auto;
  background-color: hsl(var(--pui-card));
  border-radius: var(--pui-radius);
  box-shadow: var(--pui-shadow);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  transition: var(--pui-transition);
  transition-duration: var(--pui-overlay-transition-duration);
  transition-property: opacity, transform;
}

.pui-popup:not(.pui-popup-visible) .pui-popup-container {
  opacity: 0;
  transform: translate3d(0, 1.5rem, 0) scale(0.97);
}

.pui-popup-header {
  padding: 0.75rem;
  border-bottom-width: 1px;
}

.pui-popup-content {
  padding: 0.75rem;
}

.pui-popup-footer {
  padding: 0.75rem;
  border-top-width: 1px;
}

@media (max-width: 767px) {
  .pui-popup {
    padding: 0.5rem;
  }
}
</style>
