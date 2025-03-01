<template>
  <component
    :is="is ?? (to ? NuxtLink : 'button')"
    :to="to"
    :type="type ?? (!is || is === 'button' ? 'button' : undefined)"
    @mouseenter="$el.focus()"
    @mouseleave="blurActiveElement()"
    class="pui-dropdown-item pui-raw"
    :class="{
      'pui-dropdown-item-destructive': destructive,
      'pui-dropdown-item-indent': indent,
    }"
  >
    <span class="pui-dropdown-item-inner">
      <slot />
    </span>
  </component>
</template>

<script lang="ts" setup>
import { NuxtLink } from '#components'
import { blurActiveElement } from '@pruvious/utils'
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
   * Controls text indentation within the button.
   * When enabled, it aligns text with other icon-containing buttons even if this button has no icon.
   *
   * @default false
   */
  indent: {
    type: Boolean,
    default: false,
  },

  /**
   * Defines whether the button has a destructive action.
   * This will highlight the button in red.
   *
   * @default false
   */
  destructive: {
    type: Boolean,
    default: false,
  },
})
</script>

<style>
.pui-dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  height: 2em;
  padding: 0 0.5em;
  border: none;
  background-color: hsl(var(--pui-background));
  border-radius: calc(var(--pui-radius) - 0.25rem);
  outline: none;
  color: hsl(var(--pui-foreground));
  white-space: nowrap;
  text-decoration: none;
}

.pui-dropdown-item-indent {
  padding-left: calc(2em + 0.125rem);
}

.pui-dropdown-item:focus {
  background-color: hsl(var(--pui-card) / 0.16);
}

.pui-dropdown-item-destructive:focus {
  background-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive-foreground));
}

.pui-dropdown-item-inner {
  display: flex;
  align-items: center;
  gap: 0.5em;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pui-dropdown-item-inner > svg {
  flex-shrink: 0;
  font-size: calc(1em + 0.125rem);
}

.pui-dropdown-item-inner > span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.pui-dropdown-item-inner > kbd {
  flex-shrink: 0;
  display: flex;
  gap: 0.25em;
  margin-right: -0.25em;
  margin-left: auto;
  font-family: var(--pui-font);
  font-size: calc(1em - 0.125rem);
  letter-spacing: 0.25em;
  opacity: 0.64;
}

.pui-dropdown-item-inner > kbd > span {
  letter-spacing: initial;
}

.pui-dropdown-item-inner > kbd > span:last-child {
  margin-right: 0.25em;
}
</style>
