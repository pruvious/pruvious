<template>
  <component
    :is="is ?? (to ? NuxtLink : 'button')"
    :tabindex="disabled ? -1 : undefined"
    :to="to"
    :type="type ?? (!is || is === 'button' ? 'button' : undefined)"
    class="pui-button pui-raw"
    :class="[
      `pui-button-${variant}`,
      { 'pui-button-destructive-hover': destructiveHover, 'pui-button-disabled': disabled },
    ]"
    :style="{ '--pui-size': size }"
  >
    <span class="pui-button-inner">
      <slot />
    </span>

    <div v-if="$slots.bubble" class="pui-button-bubble">
      <slot name="bubble" />
    </div>
  </component>
</template>

<script lang="ts" setup>
import { NuxtLink } from '#components'
import type { RouteLocationAsPathGeneric, RouteLocationAsRelativeGeneric } from 'vue-router'

defineProps({
  /**
   * A dynamic component or an HTML tag to render.
   *
   * Default behavior:
   *
   * - When no `to` prop is set, renders as a native `<button>` element.
   * - If `to` prop exists, renders as a `<NuxtLink>` component for navigation.
   *
   * @default 'button'
   */
  is: {
    type: [Object, String] as PropType<'a' | 'button' | 'span' | Component>,
  },

  /**
   * Defines the target route location for navigation when the link is clicked.
   *
   * When provided, the component renders as a `NuxtLink` by default, unless overridden by the `is` prop.
   */
  to: {
    type: [String, Object] as PropType<string | RouteLocationAsRelativeGeneric | RouteLocationAsPathGeneric>,
  },

  /**
   * Defines the type of button behavior.
   *
   * - When component `is` rendered as a `button`, defaults to `button`.
   * - When rendered as another element, defaults to `undefined`.
   */
  type: {
    type: String as PropType<'button' | 'submit' | 'reset'>,
  },

  /**
   * Defines the visual style variant of the button.
   *
   * @default 'primary'
   */
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'accent' | 'destructive' | 'outline' | 'ghost'>,
    default: 'primary',
  },

  /**
   * Determines if the button should show a destructive hover state.
   *
   * @default false
   */
  destructiveHover: {
    type: Boolean,
    default: false,
  },

  /**
   * Controls whether the button is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
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
.pui-button {
  flex-shrink: 0;
  position: relative;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  max-width: 100%;
  min-width: calc(2em + 0.25rem);
  height: calc(2em + 0.25rem);
  border: 1px solid transparent;
  border-radius: calc(var(--pui-radius) - 0.125rem);
  color: hsl(var(--pui-foreground));
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  line-height: 1.5;
  font-weight: 500;
  white-space: nowrap;
  text-decoration: none;
  transition: var(--pui-transition);
  transition-property: background-color, border-color, box-shadow, color;
}

.pui-button-primary {
  background-color: hsl(var(--pui-primary));
  color: hsl(var(--pui-primary-foreground));
}

.pui-button-primary:hover {
  background-color: hsl(var(--pui-primary) / 0.9);
}

.pui-button-secondary {
  background-color: hsl(var(--pui-secondary));
  color: hsl(var(--pui-secondary-foreground));
}

.pui-button-secondary:hover {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-button-accent {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-button-accent:hover {
  background-color: hsl(var(--pui-accent) / 0.9);
}

.pui-button-destructive {
  --pui-ring: var(--pui-destructive);
  background-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive-foreground));
}

.pui-button-destructive:hover {
  background-color: hsl(var(--pui-destructive) / 0.9);
}

.pui-button-outline {
  background-color: hsl(var(--pui-background));
  border: 1px solid hsl(var(--pui-input));
}

.pui-button-outline:hover {
  background-color: hsl(var(--pui-accent));
  border: 1px solid hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-button-ghost {
  background-color: transparent;
}

.pui-button-ghost:hover {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-button-destructive-hover {
  --pui-ring: var(--pui-destructive);
}

.pui-button-destructive-hover:hover {
  background-color: hsl(var(--pui-destructive) / 0.9);
  border-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive-foreground));
}

.pui-button:focus-visible {
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-background)),
    0 0 0 0.25rem hsl(var(--pui-ring)),
    0 0 #0000;
  outline: 0.125rem solid transparent;
  outline-offset: 0.125rem;
}

.pui-button-disabled {
  pointer-events: none;
  opacity: 0.5;
}

.pui-button-inner {
  display: flex;
  align-items: center;
  gap: 0.375em;
  padding: 0 0.75em;
  padding: 0 round(0.75em, 1px);
  overflow: hidden;
  text-overflow: ellipsis;
}

.pui-button-inner > svg {
  flex-shrink: 0;
  pointer-events: none;
  font-size: calc(1em + 0.25rem);
}

.pui-button-inner > svg:first-child {
  margin-left: -0.25em;
  margin-left: round(-0.25em, 1px);
}

.pui-button-inner > svg:last-child {
  margin-right: -0.25em;
  margin-right: round(-0.25em, 1px);
}

.pui-button-inner > svg:only-child {
  position: absolute;
  top: 50%;
  left: 50%;
  margin: 0;
  transform: translate3d(-50%, -50%, 0);
}

.pui-button-inner > span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.pui-button-bubble {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  display: flex;
  transform: translate(50%, -50%);
}
</style>
