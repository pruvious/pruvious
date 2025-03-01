<template>
  <PruviousDashboardPage noMainPadding>
    <div class="p-overview">
      <div class="p-overview-content">
        <Icon mode="svg" name="tabler:barrier-block" />
        <p class="p-overview-text">This page is currently under construction</p>
      </div>
    </div>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { __, dashboardBasePath } from '#pruvious/client'

definePageMeta({
  path: dashboardBasePath + 'overview',
  middleware: ['pruvious-dashboard', 'pruvious-dashboard-auth-guard'],
})

useHead({
  title: __('pruvious-dashboard', 'Overview'),
})
</script>

<style scoped>
:deep(.p-page-main) {
  height: 100%;
}

.p-overview {
  display: flex;
  min-height: 100%;
}

.p-overview-content {
  margin: auto;
  padding: 0.75rem;
  text-align: center;
}

.p-overview-content svg {
  margin: 0 auto;
  color: hsl(var(--pui-muted-foreground));
  font-size: 4rem;
}

.p-overview-text {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  color: hsl(var(--pui-muted-foreground));
}
</style>
