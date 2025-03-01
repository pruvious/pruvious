<template>
  <div role="navigation" class="pui-vertical-menu" :style="{ '--pui-size': size }">
    <span v-if="title" :id="titleId" class="pui-vertical-menu-title">{{ title }}</span>
    <ul :aria-labelledby="title ? titleId : undefined" role="list" class="pui-vertical-menu-list">
      <PUIVerticalMenuItem
        v-for="(item, i) in items"
        v-model:expandedState="_expandedState"
        :action="item.action"
        :active="item.active"
        :ariaCollapseLabel="ariaCollapseLabel"
        :ariaExpandLabel="ariaExpandLabel"
        :icon="item.icon"
        :id="`${i}`"
        :label="item.label"
        :submenu="item.submenu"
        :to="item.to"
        @update:expandedState="$emit('update:expandedState', $event)"
      />
    </ul>
  </div>
</template>

<script lang="ts" setup>
import type { PUIVerticalMenuItemModel } from './PUIVerticalMenuItem.vue'

const props = defineProps({
  /**
   * The menu title.
   */
  title: {
    type: String,
  },

  /**
   * The menu items.
   */
  items: {
    type: Array as PropType<PUIVerticalMenuItemModel[]>,
  },

  /**
   * An object that contains the expanded state of the items.
   * It is automatically updated by the component.
   */
  expandedState: {
    type: Object as PropType<Record<string, boolean>>,
    default: () => ({}),
  },

  /**
   * The label for the expand buttons.
   * Only applies for items with submenus.
   */
  ariaExpandLabel: {
    type: String,
    default: 'Expand',
  },

  /**
   * The label for the collapse buttons.
   * Only applies for items with submenus.
   */
  ariaCollapseLabel: {
    type: String,
    default: 'Collapse',
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

defineEmits<{
  'update:expandedState': [value: Record<string, boolean>]
}>()

const titleId = useId()
const _expandedState = ref<Record<string, boolean>>({})

watch(
  () => props.expandedState,
  (value) => {
    _expandedState.value = value
  },
  { immediate: true },
)
</script>

<style>
.pui-vertical-menu {
  --pui-size: -1;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-vertical-menu-title {
  display: block;
  margin-bottom: 0.5em;
  font-weight: 600;
  text-transform: uppercase;
  font-size: calc(1em - 0.1875rem);
  line-height: calc(1em + 0.5rem);
}

.pui-vertical-menu-list {
  position: relative;
}
</style>
