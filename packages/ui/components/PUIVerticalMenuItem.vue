<template>
  <li
    @keydown.left.stop="collapse()"
    @keydown.right.stop="expand()"
    class="pui-vertical-menu-item"
    :class="{
      'pui-vertical-menu-item-active': active,
      'pui-vertical-menu-item-expanded': expandedState[id],
    }"
  >
    <div v-if="!to && !action" class="pui-vertical-menu-item-wrapper">
      <button
        :aria-expanded="expandedState[id]"
        :aria-label="submenu?.length ? (expandedState[id] ? ariaCollapseLabel : ariaExpandLabel) : undefined"
        @click="
          () => {
            if (submenu?.length) {
              if (expandedState[id]) {
                collapse()
              } else {
                expand()
              }
            }
          }
        "
        @keydown.down="focusNext($event)"
        @keydown.up="focusPrev($event)"
        type="button"
        class="pui-vertical-menu-item-button pui-raw"
      >
        <Icon v-if="typeof icon === 'string'" :name="`tabler:${icon}`" mode="svg" />
        <component v-else-if="icon" :is="icon" />
        <span>{{ label }}</span>
        <span class="pui-vertical-menu-item-button-toggle">
          <Icon mode="svg" name="tabler:chevron-right" />
        </span>
      </button>
    </div>

    <div v-else class="pui-vertical-menu-item-wrapper">
      <component
        :is="to ? NuxtLink : 'button'"
        :to="to"
        :type="to ? undefined : 'button'"
        @click="action?.($event as MouseEvent)"
        @keydown.down="focusNext($event)"
        @keydown.up="focusPrev($event)"
        class="pui-vertical-menu-item-button pui-raw"
      >
        <Icon v-if="typeof icon === 'string'" :name="`tabler:${icon}`" mode="svg" />
        <component v-else-if="icon" :is="icon" />
        <span>{{ label }}</span>
      </component>
      <button
        v-if="submenu?.length"
        :aria-expanded="expandedState[id]"
        :aria-label="expandedState[id] ? ariaCollapseLabel : ariaExpandLabel"
        @click="
          () => {
            if (expandedState[id]) {
              collapse()
            } else {
              expand()
            }
          }
        "
        type="button"
        class="pui-vertical-menu-item-toggle pui-raw"
      >
        <Icon mode="svg" name="tabler:chevron-right" />
      </button>
    </div>

    <ul v-show="submenu?.length && expandedState[id]" role="list" class="pui-vertical-menu-submenu">
      <PUIVerticalMenuItem
        v-for="(item, i) in submenu"
        :action="item.action"
        :active="item.active"
        :ariaCollapseLabel="ariaCollapseLabel"
        :ariaExpandLabel="ariaExpandLabel"
        :expandedState="expandedState"
        :icon="item.icon"
        :id="`${id}-${i}`"
        :label="item.label"
        :submenu="item.submenu"
        :to="item.to"
        @update:expandedState="$emit('update:expandedState', $event)"
      />
    </ul>
  </li>
</template>

<script lang="ts" setup>
import { NuxtLink } from '#components'
import type { icons } from '@iconify-json/tabler/icons.json'
import type { RouteLocationAsPathGeneric, RouteLocationAsRelativeGeneric } from 'vue-router'

export interface PUIVerticalMenuItemModel {
  /**
   * Defines the target route location for navigation when the item is clicked.
   *
   * Either provide a `to` or an `action` property, but not both.
   */
  to?: string | RouteLocationAsRelativeGeneric | RouteLocationAsPathGeneric

  /**
   * The callback function to execute when the item is clicked.
   *
   * Either provide a `to` or an `action` property, but not both.
   */
  action?: (event: MouseEvent) => any

  /**
   * The button label.
   */
  label: string

  /**
   * The button icon.
   * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
   *
   * @example
   * ```ts
   * // Tabler icon
   * 'phone'
   *
   * // Nuxt icon
   * h(Icon, { name: 'tabler:phone' })
   * ```
   */
  icon?: keyof typeof icons | VNode

  /**
   * Whether the item is active.
   * If the item is a submenu item, it will automatically expand all parent items.
   *
   * @default false
   */
  active?: boolean

  /**
   * An array of submenu items.
   */
  submenu?: PUIVerticalMenuItemModel[]
}

const props = defineProps({
  /**
   * An internal identifier for the item used to manage the expanded state.
   */
  id: {
    type: String,
    required: true,
  },

  /**
   * Whether the item is active.
   * If the item is a submenu item, it will automatically expand all parent items.
   *
   * @default false
   */
  active: {
    type: Boolean,
    default: false,
  },

  /**
   * Defines the target route location for navigation when the item is clicked.
   *
   * Either provide a `to` or an `action` property, but not both.
   */
  to: {
    type: [String, Object] as PropType<string | RouteLocationAsRelativeGeneric | RouteLocationAsPathGeneric>,
  },

  /**
   * The callback function to execute when the item is clicked.
   *
   * Either provide a `to` or an `action` property, but not both.
   */
  action: {
    type: Function as PropType<(event: MouseEvent) => any>,
  },

  /**
   * The button label.
   */
  label: {
    type: String,
  },

  /**
   * The button icon.
   * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
   *
   * @example
   * ```ts
   * // Tabler icon
   * 'phone'
   *
   * // Nuxt icon
   * h(Icon, { name: 'tabler:phone' })
   * ```
   */
  icon: {
    type: [String, Object] as PropType<keyof typeof icons | VNode>,
  },

  /**
   * The submenu items.
   */
  submenu: {
    type: Array as PropType<PUIVerticalMenuItemModel[]>,
  },

  /**
   * An object that contains the expanded state of the items.
   * It is automatically updated by the component.
   */
  expandedState: {
    type: Object as PropType<Record<string, boolean>>,
    required: true,
  },

  /**
   * The label for the expand button.
   * Only applies when the item has a submenu.
   *
   * @default 'Expand'
   */
  ariaExpandLabel: {
    type: String,
    default: 'Expand',
  },

  /**
   * The label for the collapse button.
   * Only applies when the item has a submenu.
   *
   * @default 'Collapse'
   */
  ariaCollapseLabel: {
    type: String,
    default: 'Collapse',
  },
})

const emit = defineEmits<{
  'update:expandedState': [value: Record<string, boolean>]
}>()

watch(
  () => props.active,
  () => {
    if (props.active) {
      expand()
    }
  },
  { immediate: true },
)

function focusPrev(event: KeyboardEvent) {
  const list = findList(event.target)

  if (list) {
    const buttons = [...list.querySelectorAll('.pui-vertical-menu-item-button')] as HTMLButtonElement[]
    const index = Array.from(buttons).indexOf(event.target as HTMLButtonElement)
    buttons[index - 1]?.focus()
  }
}

function focusNext(event: KeyboardEvent) {
  const list = findList(event.target)

  if (list) {
    const buttons = [...list.querySelectorAll('.pui-vertical-menu-item-button')] as HTMLButtonElement[]
    const index = Array.from(buttons).indexOf(event.target as HTMLButtonElement)
    buttons[index + 1]?.focus()
  }
}

function findList(target: EventTarget | null) {
  if (target instanceof Element) {
    let parent = target.parentElement
    while (parent) {
      if (parent.classList.contains('pui-vertical-menu')) {
        return parent
      }
      parent = parent.parentElement
    }
  }
  return null
}

function expand() {
  const expandedState = { ...props.expandedState }
  let current = ''
  for (const id of props.id.split('-')) {
    current += id
    expandedState[current] = true
    current += '-'
  }
  emit('update:expandedState', expandedState)
}

function collapse() {
  const expandedState = { ...props.expandedState }
  expandedState[props.id] = false
  emit('update:expandedState', expandedState)
}
</script>

<style>
.pui-vertical-menu-item {
  position: relative;
}

.pui-vertical-menu-item + .pui-vertical-menu-item {
  margin-top: 0.125rem;
}

.pui-vertical-menu-item-wrapper {
  display: flex;
  gap: 0.125rem;
}

.pui-vertical-menu-item-button {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5em;
  width: 100%;
  height: calc(2em + 0.25rem);
  padding: 0 0.5em;
  border-radius: var(--pui-radius);
  color: hsl(var(--pui-muted-foreground));
  text-decoration: none;
  transition: var(--pui-transition);
  transition-property: background-color, box-shadow, color;
}

.pui-vertical-menu-item-button,
.pui-vertical-menu-item-button > span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-vertical-menu-item-button:hover {
  background-color: hsl(var(--pui-secondary));
  color: hsl(var(--pui-secondary-foreground));
}

.pui-vertical-menu-item-button:focus-visible {
  box-shadow: inset 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.pui-vertical-menu-item-active > .pui-vertical-menu-item-button,
.pui-vertical-menu-item-active > .pui-vertical-menu-item-wrapper > .pui-vertical-menu-item-button {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-vertical-menu-item-active > .pui-vertical-menu-item-wrapper > .pui-vertical-menu-item-button {
  color: hsl(var(--pui-accent-foreground));
  font-weight: 500;
}

.pui-vertical-menu-item-button > svg {
  flex-shrink: 0;
  font-size: calc(1em + 0.125rem);
}

.pui-vertical-menu-item-button > .pui-vertical-menu-item-button-toggle {
  flex-shrink: 0;
  display: flex;
  width: calc(2em + 0.25rem);
  height: calc(2em + 0.25rem);
  margin-right: -0.5em;
  margin-left: auto;
}

.pui-vertical-menu-item-button > .pui-vertical-menu-item-button-toggle > svg {
  margin: auto;
}

.pui-vertical-menu-item-toggle {
  flex-shrink: 0;
  display: flex;
  width: calc(2em + 0.25rem);
  height: calc(2em + 0.25rem);
  border-radius: var(--pui-radius);
  color: hsl(var(--pui-muted-foreground));
  transition: var(--pui-transition);
  transition-property: background-color, box-shadow, color;
}

.pui-vertical-menu-item-toggle:hover {
  background-color: hsl(var(--pui-secondary));
  color: hsl(var(--pui-secondary-foreground));
}

.pui-vertical-menu-item-toggle:focus-visible {
  box-shadow: inset 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
  color: hsl(var(--pui-accent-foreground));
}

.pui-vertical-menu-item-expanded > .pui-vertical-menu-item-wrapper > .pui-vertical-menu-item-toggle,
.pui-vertical-menu-item-expanded
  > .pui-vertical-menu-item-wrapper
  > .pui-vertical-menu-item-button
  > .pui-vertical-menu-item-button-toggle {
  transform: rotate(90deg);
}

.pui-vertical-menu-item-toggle > svg {
  display: block;
  margin: auto;
  transition: var(--pui-transition);
  transition-property: transform;
}

.pui-vertical-menu-submenu {
  margin-top: 0.125rem;
  margin-left: calc(1.5em + 0.125rem);
}
</style>
