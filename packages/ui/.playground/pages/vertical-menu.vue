<template>
  <Showcase>
    <PUIVerticalMenu :items="items" :size="state.size" title="Menu" class="pui-vertical-menu" />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import type { PUIVerticalMenuItemModel } from '../../components/PUIVerticalMenuItem.vue'

const state = useShowcase()
const active = ref('development')
const items = computed<PUIVerticalMenuItemModel[]>(() => [
  { label: 'Home', icon: 'home', action: () => (active.value = 'home'), active: active.value === 'home' },
  {
    label: 'Services',
    icon: 'bolt',
    action: () => (active.value = 'services'),
    active: active.value === 'services',
    submenu: [
      { label: 'Design', action: () => (active.value = 'design'), active: active.value === 'design' },
      { label: 'Development', action: () => (active.value = 'development'), active: active.value === 'development' },
      { label: 'Marketing', action: () => (active.value = 'marketing'), active: active.value === 'marketing' },
    ],
  },
  {
    label: 'Contact',
    icon: 'phone',
    submenu: [
      { label: 'Sales', action: () => (active.value = 'sales'), active: active.value === 'sales' },
      { label: 'Support', action: () => (active.value = 'support'), active: active.value === 'support' },
    ],
  },
])
</script>

<style scoped>
.pui-vertical-menu {
  width: 20rem;
}
</style>
