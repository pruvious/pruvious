<template>
  <div class="pui-context-menu">
    <div
      ref="floating"
      class="pui-context-menu-floating"
      :style="{
        top: (event?.clientY ?? 0) + 'px',
        left: (event?.clientX ?? 0) + 'px',
      }"
    ></div>

    <PUIDropdown v-if="event" :offset="0" :reference="floating!" :size="size" @close="$emit('update:event', null)">
      <slot />
    </PUIDropdown>
  </div>
</template>

<script lang="ts" setup>
defineProps({
  /**
   * The `MouseEvent` event that triggers the context menu.
   *
   * - If provided, the context menu will be displayed.
   * - If `null`, the context menu will be hidden.
   *
   * @default null
   */
  event: {
    type: [Object, null] as PropType<MouseEvent | null>,
    default: null,
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

defineEmits<{
  'update:event': [event: MouseEvent | null]
}>()

const floating = useTemplateRef('floating')
</script>

<style>
.pui-context-menu-floating {
  position: fixed;
}
</style>
