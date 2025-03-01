<template>
  <div class="p-header-container" :class="{ 'p-has-sidebar': sidebar?.el.value }">
    <div class="p-header-left">
      <PruviousDashboardDefaultLayoutLogo class="p-header-logo" />
      <PUIButton
        v-if="sidebar?.el.value"
        :title="__('pruvious-dashboard', 'Toggle sidebar')"
        :variant="dashboardLayout.sidebarExpanded ? 'accent' : 'outline'"
        @click="sidebar.toggle()"
        class="p-header-menu-button"
      >
        <Icon mode="svg" name="tabler:menu-2" />
      </PUIButton>
    </div>

    <div class="p-header-right">
      <PruviousDashboardHeaderMenu />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { __, usePruviousDashboardLayout } from '#pruvious/client'
import type { ShallowRef } from 'vue'

const dashboardLayout = usePruviousDashboardLayout()
const sidebar = inject<{ el: Readonly<ShallowRef<HTMLDivElement | null>>; toggle: () => void }>('sidebar')
</script>

<style scoped>
.p-header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  height: 100%;
  padding: 0 0.25rem;
}

.p-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.p-header-menu-button {
  display: none;
}

.p-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 1024px) {
  .p-header-container.p-has-sidebar .p-header-logo {
    display: none;
  }

  .p-header-menu-button {
    display: inline-flex;
  }

  :deep(:where(.pui-button, .pui-icon-group)) {
    --pui-size: -2;
  }
}
</style>
