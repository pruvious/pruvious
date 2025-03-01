<template>
  <div role="alert" class="pui-alert" :class="[`pui-alert-${variant}`]" :style="{ '--pui-size': size }">
    <div v-if="$slots.icon" class="pui-alert-icon">
      <slot name="icon" />
    </div>

    <div class="pui-alert-main">
      <p v-if="title" class="pui-alert-title">{{ title }}</p>
      <div class="pui-alert-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps({
  /**
   * Defines the visual style variant of the alert.
   *
   * @default 'primary'
   */
  variant: {
    type: String as PropType<'primary' | 'destructive'>,
    default: 'primary',
  },

  /**
   * The title of the alert.
   */
  title: {
    type: String,
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
.pui-alert {
  --pui-background: var(--pui-card);
  --pui-foreground: var(--pui-card-foreground);
  display: flex;
  gap: 0.5em;
  width: 100%;
  max-width: 100%;
  background-color: hsl(var(--pui-card));
  border-width: 1px;
  border-radius: var(--pui-radius);
  padding: 0.75em;
  padding: round(0.75em, 1px);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-alert-destructive {
  --pui-foreground: var(--pui-destructive);
  --pui-accent: var(--pui-destructive) / 0.15;
  --pui-accent-foreground: var(--pui-destructive);
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive));
}

.dark .pui-alert-destructive {
  background-color: hsl(var(--pui-background));
}

.pui-alert-icon {
  flex-shrink: 0;
  font-size: 1.5em;
}

.pui-alert-main {
  flex: 1;
}

.pui-alert-title {
  margin-bottom: 0.125em;
  font-weight: 600;
}

.pui-alert-content {
  font-size: calc(1em - 0.0625rem);
}
</style>
