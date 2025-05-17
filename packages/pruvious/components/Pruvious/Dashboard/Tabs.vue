<template>
  <PUITabs :active="active" :list="list" @change="$emit('change', $event)">
    <template #nav="{ active, choices, setActive }">
      <div v-if="choices.length > 1" class="p-tabs-list">
        <div ref="nav" class="p-tabs-list-scrollable">
          <button
            v-for="(choice, index) of choices"
            @click="setActive(choice.value)"
            type="button"
            class="p-tabs-list-button pui-raw"
            :class="{ 'p-tabs-list-button-active': choice.value === active }"
          >
            <span>{{ choice.label }}</span>
            <PUIBubble
              v-if="list[index]?.bubble"
              v-pui-tooltip="list[index].bubble?.tooltip"
              :variant="list[index].bubble?.variant"
            >
              {{ list[index].bubble.content }}
            </PUIBubble>
          </button>
        </div>
      </div>
    </template>
    <slot />
  </PUITabs>
</template>

<script generic="T extends number | string" lang="ts" setup>
import type { PUITabListItem } from '@pruvious/ui/components/PUITabs.vue'

defineProps({
  /**
   * An array of tab labels.
   */
  list: {
    type: Array as PropType<PUITabListItem<T>[]>,
    required: true,
  },

  /**
   * The name of the active tab.
   * If not provided, the first tab in the list is selected.
   */
  active: {
    type: [Number, String] as unknown as PropType<T>,
  },
})

defineEmits<{
  change: [id: T]
}>()

const nav = useTemplateRef('nav')

onMounted(() => {
  setTimeout(() => {
    const active = nav.value?.querySelector('.p-tabs-list-button-active')

    if (active) {
      const { left, right, width: activeWidth } = active.getBoundingClientRect()
      const { left: containerLeft, right: containerRight, width: containerWidth } = nav.value!.getBoundingClientRect()
      const activeCenter = left + activeWidth / 2
      const containerCenter = containerLeft + containerWidth / 2
      const scrollOffset = activeCenter - containerCenter + nav.value!.scrollLeft

      if (left < containerLeft || right > containerRight) {
        nav.value!.scrollTo({ left: scrollOffset })
      }
    }
  })
})
</script>

<style scoped>
.p-tabs-list {
  flex-shrink: 0;
  position: relative;
  width: calc(100% + 1.5rem);
  margin: 0 -0.75rem;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  line-height: 1.5;
  white-space: nowrap;
}

.p-tabs-list-scrollable {
  display: flex;
  gap: 0.75rem;
  margin-top: -0.125rem;
  padding: 0.125rem 0.75rem calc(0.75rem + 1px);
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--pui-foreground) / 0.25) transparent;
}

.p-tabs-list-scrollable::before {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background-color: hsl(var(--pui-border));
}

.p-tabs-list-button {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5em;
  position: relative;
  margin: 0 -0.25rem;
  padding: 0 0.25rem;
  border-radius: calc(var(--pui-radius) - 0.125rem);
  color: hsl(var(--pui-muted-foreground));
  font-weight: 500;
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow, color;
}

.p-tabs-list-button:focus-visible,
.p-tabs-list-button-focus-visible {
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.p-tabs-list-button::after {
  content: '';
  position: absolute;
  right: 0.25rem;
  bottom: calc(-0.75rem - 1px);
  left: 0.25rem;
  height: 1px;
  background-color: hsl(var(--pui-foreground));
  border-radius: var(--pui-radius);
  pointer-events: none;
  opacity: 0;
  transition: var(--pui-transition);
  transition-property: opacity;
}

.p-tabs-list-button:hover,
.p-tabs-list-button-active {
  color: hsl(var(--pui-foreground));
}

.p-tabs-list-button-active::after {
  opacity: 1;
}

.p-tabs-list-button :deep(.pui-bubble) {
  border: none;
}
</style>
