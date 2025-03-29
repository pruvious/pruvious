<template>
  <div
    ref="root"
    class="pui-floater"
    :class="{
      'pui-floater-visible': isVisible,
      'pui-floater-has-errors': error,
      'pui-floater-disabled': disabled,
    }"
    :style="{ '--pui-size': size }"
  >
    <button
      :aria-expanded="isVisible"
      :tabindex="disabled ? -1 : 0"
      :title="handleTitle"
      @click="
        () => {
          if (!disabled) {
            toggle()
          }
        }
      "
      ref="handle"
      type="button"
      class="pui-floater-handle pui-raw"
    >
      <slot name="handle" />
    </button>

    <div
      v-if="isActive"
      ref="floating"
      tabindex="-1"
      class="pui-floater-floating"
      :class="`pui-floater-floating-${floatingPlacement}`"
      :style="{ ...floatingStyles, '--pui-size': size }"
    >
      <div ref="container" class="pui-floater-container">
        <slot />
      </div>
    </div>

    <slot name="after" />
  </div>
</template>

<script lang="ts" setup>
import {
  autoPlacement,
  size as autoSize,
  autoUpdate,
  offset as floatingOffset,
  shift,
  useFloating,
} from '@floating-ui/vue'
import { blurActiveElement, isDefined, sleep } from '@pruvious/utils'
import { onClickOutside, useEventListener, useScrollLock } from '@vueuse/core'
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap'

const props = defineProps({
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
   * Text to display in the `title` attribute of the handle.
   */
  handleTitle: {
    type: String,
  },

  /**
   * The type of CSS position property to use for the floating element.
   * The `fixed` value is recommended for most cases.
   * The `absolute` value is useful when the picker is inside a scrolling container.
   * You can also `provide('floatingStrategy', 'absolute')` from a parent component to change the default value.
   *
   * @default 'fixed'
   */
  strategy: {
    type: String as PropType<'fixed' | 'absolute'>,
    default: 'fixed',
  },
})

const root = useTemplateRef('root')
const handle = useTemplateRef('handle')
const floating = useTemplateRef('floating')
const container = useTemplateRef('container')
const isActive = ref(false)
const isVisible = ref(false)
const parentContainer = inject<Ref<HTMLDivElement> | null>('root', null)
const { floatingStyles, placement: floatingPlacement } = useFloating(handle, floating, {
  middleware: [
    autoPlacement({
      allowedPlacements: ['bottom-start', 'bottom-end', 'top-start', 'top-end'],
    }),
    autoSize({
      apply({ availableWidth, availableHeight, elements }) {
        if (availableWidth < container.value!.offsetWidth) {
          elements.floating.style.width = `${Math.max(0, availableWidth)}px`
        }

        if (availableHeight - 8 < container.value!.scrollHeight) {
          elements.floating.style.height = `${Math.max(0, availableHeight - 8)}px`
        }
      },
      padding: 8,
    }),
    floatingOffset(7),
    shift({ padding: 8 }),
  ],
  placement: 'bottom-start',
  strategy: inject('floatingStrategy', props.strategy),
  whileElementsMounted: autoUpdate,
})
const { activate: activateFocusTrap, deactivate: deactivateFocusTrap } = useFocusTrap(floating, {
  allowOutsideClick: true,
  escapeDeactivates: false,
  initialFocus: false,
  returnFocusOnDeactivate: false,
})

const emit = defineEmits<{
  open: []
  close: []
  keydown: [event: KeyboardEvent]
}>()

defineExpose({ handle, container, open, close, toggle, isActive, isVisible })

let transitionDuration = 300

/**
 * Stops the listener for keydown events.
 */
let stopKeydownListener: (() => void) | undefined

/**
 * Stops listening for click events outside the field.
 */
let stopOutsideClickListener: (() => void) | undefined

/**
 * Stops listening for resize events.
 */
let stopResizeListener: (() => void) | undefined

/**
 * Locks the scroll when the floater is expanded.
 */
const scrollLockWindow = isDefined(window) ? useScrollLock(window) : undefined
const scrollLockParentContainer = useScrollLock(parentContainer)

onMounted(() => {
  setTimeout(() => {
    const potd = getComputedStyle(document.body).getPropertyValue('--pui-overlay-transition-duration')
    transitionDuration = potd.endsWith('ms') ? parseInt(potd) : potd.endsWith('s') ? parseFloat(potd) * 1000 : 300
  })
})

/**
 * Opens the floater.
 */
async function open(event?: Event) {
  if (!isActive.value) {
    // Prevent the default behavior of keydown events
    event?.preventDefault()

    // Emit the open event
    emit('open')

    // Blur active element
    blurActiveElement()

    // Listen to keydown events
    stopKeydownListener = useEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopImmediatePropagation()
          close(event)
          handle.value?.focus()
        } else {
          emit('keydown', event)
        }
      },
      { capture: true },
    )

    // Expand
    isActive.value = true
    await nextTick()
    isVisible.value = true
    await nextTick()

    // Close the floater when the user clicks outside the field
    stopOutsideClickListener = onClickOutside(root, () => close())

    // Close the floater when the window is resized
    stopResizeListener = useEventListener('resize', () => close())

    // Lock parent scroll
    scrollLockWindow!.value = true
    scrollLockParentContainer.value = true

    // Activate focus trap
    setTimeout(() => {
      if (isVisible.value) {
        activateFocusTrap()
      }
    }, transitionDuration)
  }
}

/**
 * Closes the floater.
 */
async function close(event?: Event) {
  if (isActive.value) {
    // Prevent the default behavior of keydown events
    event?.preventDefault()

    // Emit the close event
    emit('close')

    // Deactivate focus trap
    deactivateFocusTrap()

    // Stop listening for keydown events
    stopKeydownListener?.()

    // Return focus on keybord events
    if (event instanceof KeyboardEvent || (event instanceof PointerEvent && !event.pointerType)) {
      handle.value?.focus()
    }

    // Collapse
    isVisible.value = false
    await sleep(transitionDuration)
    isActive.value = false

    // Stop listening for click events outside the field
    stopOutsideClickListener?.()

    // Stop listening for resize events
    stopResizeListener?.()

    // Unlock window scroll
    scrollLockWindow!.value = false
    scrollLockParentContainer.value = false
  }
}

/**
 * Toggles the visibility of the floater.
 */
function toggle(event?: Event) {
  if (isActive.value) {
    close(event)
  } else {
    open(event)
  }
}
</script>

<style>
.pui-floater {
  display: flex;
  width: 100%;
  height: calc(2em + 0.25rem);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-floater-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-floater-handle {
  --pui-background: var(--pui-card);
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(0.5em + 0.125rem);
  width: 100%;
  height: 100%;
  padding: 0 0.5em;
  background-color: hsl(var(--pui-card));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  outline: none;
  cursor: pointer;
  color: hsl(var(--pui-card-foreground));
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.pui-floater-has-errors .pui-floater-handle {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-floater-handle:focus-visible {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.pui-floater-disabled .pui-floater-handle {
  --pui-foreground: var(--pui-muted-foreground);
  background-color: hsl(var(--pui-muted));
  cursor: default;
  color: hsl(var(--pui-muted-foreground));
}

.pui-floater-floating {
  z-index: 99997;
  max-width: 100%;
  outline: none;
}

.pui-floater-container {
  --pui-background: var(--pui-card);
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--pui-foreground) / 0.25) transparent;
  background-color: hsl(var(--pui-card));
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  outline: none;
  transition: var(--pui-transition);
  transition-property: opacity, visibility, transform;
}

.pui-floater:not(.pui-floater-visible) .pui-floater-container {
  opacity: 0;
  visibility: hidden;
  transform: translate3d(0, -0.5rem, 0) scale(0.95);
}

.pui-floater:not(.pui-floater-visible) .pui-floater-floating-top-start .pui-floater-container,
.pui-floater:not(.pui-floater-visible) .pui-floater-floating-top-end .pui-floater-container {
  transform: translate3d(0, 0.5rem, 0) scale(0.95);
}
</style>
