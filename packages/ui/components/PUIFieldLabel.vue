<template>
  <div
    @click="onClick"
    class="pui-field-label"
    :class="{ 'pui-field-label-required': required }"
    :style="{ '--pui-size': size }"
  >
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

  /**
   * Indicates whether the label is required.
   * If `true`, an asterisk is displayed next to the label.
   *
   * @default false
   */
  required: {
    type: Boolean,
    default: false,
  },
})

const { dispatch } = puiTrigger()

/**
 * Dispatches a custom event to focus the related input field when clicking on the label.
 */
function onClick(event: MouseEvent) {
  if (event.target instanceof HTMLLabelElement && event.target.hasAttribute('for')) {
    dispatch(`focus:${event.target.getAttribute('for')}`)
  }
}
</script>

<style>
.pui-field-label {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  row-gap: 0.5em;
  row-gap: round(0.5em, 1px);
  column-gap: 1em;
  width: 100%;
  max-width: 100%;
  font-size: calc(1rem + var(--pui-size) * 0.0625rem);
}

.pui-field-label :where(label, .pui-label) {
  margin-right: auto;
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
}

.pui-field-label-required :where(label, .pui-label)::after {
  content: '*';
  margin-left: 0.125em;
  margin-left: round(0.125em, 1px);
  color: hsl(var(--pui-destructive));
}

.pui-field-label p {
  width: 100%;
  color: hsl(var(--pui-muted-foreground));
  font-size: calc(1em - 0.25rem);
  line-height: 1.25;
  line-height: round(calc(1.25 * 1em), 1px);
}

.pui-field-label :not(p) {
  font-size: calc(1em - 0.125rem);
  line-height: 1.25;
  line-height: round(calc(1.25 * 1em), 1px);
}

.pui-field-label svg {
  font-size: calc(1em - 0.0625rem);
}
</style>
