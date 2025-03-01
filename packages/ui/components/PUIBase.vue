<template>
  <div class="pui-base" :style="{ '--pui-size': size, '--pui-spacing': spacing }">
    <div class="pui-base-content">
      <slot />
    </div>
    <PUIDialog />
    <PUIToaster />
  </div>
</template>

<script lang="ts" setup>
import '../styles'

defineProps({
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
   * Adjusts the spacing between elements and text (line height).
   *
   * Examples:
   *
   * - -2 (very tight spacing)
   * - -1 (tight spacing)
   * - 0 (default spacing)
   * - 1 (loose spacing)
   * - 2 (very loose spacing)
   *
   * By default, the value is inherited as the CSS variable `--pui-spacing` from the parent element.
   */
  spacing: {
    type: Number,
  },
})
</script>
