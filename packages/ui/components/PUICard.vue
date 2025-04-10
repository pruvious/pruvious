<template>
  <div class="pui-card" :style="{ '--pui-size': size }">
    <div v-if="$slots.header" name="header" class="pui-card-header">
      <slot name="header" />
    </div>

    <div v-if="$slots.default" name="default" class="pui-card-body">
      <slot />
    </div>

    <div v-if="$slots.footer" name="footer" class="pui-card-footer">
      <slot name="footer" />
    </div>
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
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-card > :where(*):not(:first-child) {
  border-top-width: 1px;
}

.pui-card-header {
  padding: var(--pui-padding-header, 0.75rem);
}

.pui-card-body {
  container-type: inline-size;
  padding: var(--pui-padding-body, 0.75rem);
}

.pui-card-body > :where(*) {
  margin-top: 1em;
}

.pui-card-body > :where(:first-child) {
  margin-top: 0;
}

.pui-card-footer {
  padding: var(--pui-padding-footer, 0.75rem);
}
</style>
