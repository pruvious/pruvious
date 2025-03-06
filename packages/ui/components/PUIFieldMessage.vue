<template>
  <div class="pui-field-message" :class="{ 'pui-field-message-has-errors': error }" :style="{ '--pui-size': size }">
    <Icon v-if="error" mode="svg" name="tabler:exclamation-circle-filled" />
    <div class="pui-field-message-inner">
      <slot />
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

  /**
   * Indicates whether the input has errors.
   *
   * @default false
   */
  error: {
    type: Boolean,
    default: false,
  },
})
</script>

<style>
.pui-field-message {
  display: flex;
  gap: 0.375em;
  max-width: 100%;
  font-size: calc(1rem + var(--pui-size) * 0.0625rem);
  color: hsl(var(--pui-muted-foreground));
}

.pui-field-message-has-errors {
  color: hsl(var(--pui-destructive));
  font-weight: 500;
}

.pui-field-message-inner {
  font-size: calc(1em - 0.125rem);
  line-height: 1.25;
  line-height: round(calc(1.25 * 1em), 1px);
}

.pui-field-message-inner code {
  color: hsl(var(--pui-foreground));
  font-family: var(--pui-font-mono);
  font-weight: 500;
  font-style: normal;
}

.pui-field-message svg {
  margin-top: -0.5px;
  font-size: calc(1em + 0.0625rem);
  flex-shrink: 0;
}
</style>
