<template>
  <div class="pui-field" :style="{ '--pui-size': size }">
    <slot />
  </div>
</template>

<script lang="ts" setup>
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
})
</script>

<style>
.pui-field {
  width: 100%;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-field + .pui-field {
  margin-top: calc(1em + 0.125rem);
}

.pui-field + .pui-field-narrow {
  margin-top: calc(0.5em + 0.125rem);
}

.pui-field > * + * {
  margin-top: 0.5em;
}
</style>
