<template>
  <span ref="root" class="pui-bubble" :class="`pui-bubble-${variant}`" :style="{ '--pui-size': size }">
    <slot />
  </span>
</template>

<script lang="ts" setup>
defineProps({
  /**
   * Defines the visual style variant of the bubble.
   *
   * @default 'primary'
   */
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'accent' | 'destructive'>,
    default: 'primary',
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
</script>

<style>
.pui-bubble {
  flex-shrink: 0;
  display: inline-block;
  border-radius: 999rem;
  min-width: 1em;
  min-width: round(1em, 1px);
  min-height: 1em;
  min-height: round(1em, 1px);
  padding: 0.125em 0.375em;
  padding: round(0.125em, 1px) round(0.375em, 1px);
  border: 1px solid hsl(var(--pui-background));
  font-size: calc(1rem + var(--pui-size) * 0.125rem - 0.1875rem);
  font-weight: 600;
}

.pui-bubble:empty {
  padding: 0;
}

.pui-bubble-primary {
  background-color: hsl(var(--pui-primary));
  color: hsl(var(--pui-primary-foreground));
}

.pui-bubble-secondary {
  background-color: hsl(var(--pui-secondary));
  color: hsl(var(--pui-secondary-foreground));
}

.pui-bubble-accent {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-bubble-destructive {
  background-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive-foreground));
}
</style>
