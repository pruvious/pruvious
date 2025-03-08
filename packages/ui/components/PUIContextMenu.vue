<template>
  <div class="pui-context-menu">
    <div ref="floating" class="pui-context-menu-floating" :style="{ top, left }"></div>
    <PUIDropdown v-if="event" :offset="0" :reference="floating!" :size="size" @close="$emit('update:event', null)">
      <slot />
    </PUIDropdown>
  </div>
</template>

<script lang="ts" setup>
import { deselectAll } from '@pruvious/utils'

const props = defineProps({
  /**
   * The `MouseEvent` or `TouchEvent` event that triggers the context menu.
   *
   * - If provided, the context menu will be displayed.
   * - If `null`, the context menu will be hidden.
   *
   * @default null
   */
  event: {
    type: [Object, null] as PropType<MouseEvent | TouchEvent | null>,
    default: null,
  },

  /**
   * The duration in milliseconds to trigger the context menu on touch devices.
   *
   * @default 500
   */
  touchDuration: {
    type: Number,
    default: 500,
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
  'update:event': [event: MouseEvent | TouchEvent | null]
}>()

const floating = useTemplateRef('floating')
const top = computed(() =>
  props.event && 'clientY' in props.event ? `${props.event.clientY}px` : `${props.event?.touches[0]?.clientY ?? 0}px`,
)
const left = computed(() =>
  props.event && 'clientY' in props.event ? `${props.event.clientX}px` : `${props.event?.touches[0]?.clientX ?? 0}px`,
)

let touchTimeout: NodeJS.Timeout | undefined = undefined

onUnmounted(() => {
  clearTimeout(touchTimeout)
})

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  emit('update:event', e)
}

function onTouchStart(e: TouchEvent) {
  touchTimeout = setTimeout(() => {
    emit('update:event', e)
  }, props.touchDuration)
}

function onTouchEnd() {
  clearTimeout(touchTimeout)
  setTimeout(deselectAll, 50)
}

defineExpose({
  onContextMenu,
  onTouchStart,
  onTouchEnd,
})
</script>

<style>
.pui-context-menu-floating {
  position: fixed;
}
</style>
