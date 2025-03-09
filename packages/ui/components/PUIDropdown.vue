<template>
  <div
    ref="floating"
    tabindex="-1"
    class="pui-dropdown"
    :class="[{ 'pui-dropdown-mounted': isMounted }, `pui-dropdown-${floatingPlacement}`]"
    :style="{ ...floatingStyles, '--pui-size': size }"
  >
    <PUIScrollable :autoScroll="itemHeight" class="pui-dropdown-scrollable">
      <div ref="inner" class="pui-dropdown-inner">
        <slot />
      </div>
    </PUIScrollable>
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
import { isDescendant } from '@pruvious/utils'
import { onKeyDown, useEventListener } from '@vueuse/core'

export interface PUIDropdownItemModel {
  /**
   * The text displayed for the dropdown item.
   */
  label: string

  /**
   * Optional array of nested dropdown items.
   * When provided, creates a hierarchical/cascading dropdown menu.
   */
  choices?: PUIDropdownItemModel[]
}

const props = defineProps({
  /**
   * The reference element (anchor) that the floating element will be positioned relative to.
   * Must be a Vue `ref` containing an HTML element.
   */
  reference: {
    type: Object as PropType<HTMLElement>,
  },

  /**
   * Specifies which side of the `reference` element the dropdown should appear.
   * The dropdown will try to position itself on this side first.
   */
  placement: {
    type: String as PropType<'start' | 'end'>,
    default: 'start',
  },

  /**
   * The distance between the dropdown menu and its `reference` element, measured in pixels.
   */
  offset: {
    type: Number,
    default: 4,
  },

  /**
   * Determines whether the dropdown should restore focus to the previously focused element when closed.
   */
  restoreFocus: {
    type: Boolean,
    default: true,
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
  close: []
}>()

const floating = useTemplateRef('floating')
const reference = computed(() => props.reference)
const inner = useTemplateRef('inner')
const isMounted = ref(false)
const stop: (() => void)[] = []
const itemHeight = ref(0)
const prevFocus = ref<HTMLElement>()
const {
  floatingStyles,
  update,
  placement: floatingPlacement,
} = useFloating(reference, floating, {
  middleware: [
    autoPlacement({
      allowedPlacements:
        props.placement === 'start'
          ? ['bottom-start', 'bottom-end', 'top-start', 'top-end']
          : ['bottom-end', 'bottom-start', 'top-end', 'top-start'],
    }),
    autoSize({
      apply({ availableHeight, elements }) {
        if (availableHeight < inner.value!.offsetHeight) {
          elements.floating.style.height = `${Math.max(0, availableHeight)}px`
        }
      },
      padding: 8,
    }),
    floatingOffset(props.offset),
    shift(),
  ],
  placement: props.placement === 'start' ? 'bottom-start' : 'bottom-end',
  strategy: 'fixed',
  whileElementsMounted: autoUpdate,
})

defineExpose({
  update,
})

useEventListener(document, 'keydown', (event) => {
  if (!['Enter', 'Escape', 'Space'].includes(event.code)) {
    event.preventDefault()
  }
})

onKeyDown('ArrowUp', focusPrevious)
onKeyDown('ArrowDown', focusNext)
onKeyDown('Tab', (event) => (event.shiftKey ? focusPrevious() : focusNext()))
onKeyDown('Escape', () => emit('close'))

onMounted(() => {
  document.body.classList.add('pui-no-click')

  prevFocus.value = document.activeElement as HTMLElement
  floating.value?.focus()

  setTimeout(() => {
    stop.push(
      useEventListener(document.body, 'click', (event) => {
        if (event.target instanceof HTMLElement && !isDescendant(event.target, floating.value!)) {
          emit('close')
        }
      }),
      useEventListener(document.body, 'contextmenu', (event) => {
        if (event.target instanceof HTMLElement && !isDescendant(event.target, floating.value!)) {
          emit('close')
        }
      }),
    )

    isMounted.value = true
  })

  itemHeight.value = calcItemSizes().itemHeight
})

onUnmounted(() => {
  document.body.classList.remove('pui-no-click')
  stop.forEach((s) => s())
  if (props.restoreFocus) {
    setTimeout(() => prevFocus.value?.focus())
  }
})

/**
 * Focuses the previous item in the dropdown list.
 */
function focusPrevious() {
  if (floating.value) {
    const items = [...floating.value.querySelectorAll('.pui-dropdown-item')] as HTMLElement[]
    const index = items.findIndex((item) => item === document.activeElement)
    const prev = items[index - 1] ?? items[items.length - 1]
    prev?.focus()
  }
}

/**
 * Focuses the next item in the dropdown list.
 */
function focusNext() {
  if (floating.value) {
    const items = [...floating.value.querySelectorAll('.pui-dropdown-item')] as HTMLElement[]
    const index = items.findIndex((item) => item === document.activeElement)
    const next = items[index + 1] ?? items[0]
    next?.focus()
  }
}

/**
 * Calculates the base font size, em unit, and the height of an item in the dropdown list.
 *
 * @returns the calculated sizes in pixels.
 */
function calcItemSizes() {
  const baseFontSize = +getComputedStyle(document.documentElement).getPropertyValue('font-size').slice(0, -2)
  const sizeVar = floating.value ? getComputedStyle(floating.value).getPropertyValue('--pui-size') : undefined
  const size = sizeVar ? +sizeVar : 0
  const em = baseFontSize + size * 0.125 * baseFontSize
  const itemHeight = 2 * em

  return { baseFontSize, em, itemHeight }
}
</script>

<style>
.pui-dropdown {
  --pui-background: var(--pui-primary);
  --pui-foreground: var(--pui-primary-foreground);
  z-index: 99997;
  display: flex;
  flex-direction: column;
  width: 15em;
  max-width: 100%;
  outline: none;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-no-click .pui-dropdown,
.pui-no-click .pui-dropdown * {
  pointer-events: all !important;
}

.pui-dropdown-scrollable {
  background-color: hsl(var(--pui-background));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  box-shadow: var(--pui-shadow);
  color: hsl(var(--pui-foreground));
}

.pui-dropdown-mounted .pui-dropdown-scrollable {
  transition: var(--pui-transition);
  transition-property: opacity, transform;
}

.pui-dropdown:not(.pui-dropdown-mounted) .pui-dropdown-scrollable {
  opacity: 0;
  transform: translate3d(0, -0.5rem, 0) scale(0.95);
}

.pui-dropdown-top-start:not(.pui-dropdown-mounted) .pui-dropdown-scrollable,
.pui-dropdown-top-end:not(.pui-dropdown-mounted) .pui-dropdown-scrollable {
  transform: translate3d(0, 0.5rem, 0) scale(0.95);
}

.pui-dropdown-inner {
  padding: 0.25rem;
}

.pui-dropdown-inner > hr {
  width: calc(100% + 0.5rem);
  margin: 0.25rem -0.25rem;
  height: 1px;
  background-color: hsl(var(--pui-card) / 0.16);
  border: none;
}
</style>
