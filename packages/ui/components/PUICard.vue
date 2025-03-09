<template>
  <div class="pui-card" :style="{ '--pui-size': size }">
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
.pui-card {
  --pui-background: var(--pui-card);
  --pui-foreground: var(--pui-card-foreground);
  display: block;
  width: 100%;
  max-width: 100%;
  background-color: hsl(var(--pui-card));
  border-width: 1px;
  border-radius: var(--pui-radius);
  padding: 0.75rem;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-card > :where(*) {
  margin-top: 1em;
}

.pui-card > :where(:first-child) {
  margin-top: 0;
}
</style>
