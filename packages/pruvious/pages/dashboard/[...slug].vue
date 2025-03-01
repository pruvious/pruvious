<template>
  <PruviousDashboardPage noMainPadding>
    <div class="p-404">
      <div class="p-404-content">
        <p class="p-404-title">404</p>
        <p class="p-404-text">{{ __('pruvious-dashboard', 'Page not found') }}</p>
        <PUIButton :to="dashboardBasePath" variant="secondary">
          <Icon mode="svg" name="tabler:arrow-left" />
          <span>{{ __('pruvious-dashboard', 'Go back home') }}</span>
        </PUIButton>
      </div>
    </div>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { __, dashboardBasePath } from '#pruvious/client'

definePageMeta({
  path: dashboardBasePath + ':catchAll(.*)',
  middleware: ['pruvious-dashboard', 'pruvious-dashboard-auth-guard'],
})

useHead({
  title: __('pruvious-dashboard', 'Page not found'),
})
</script>

<style scoped>
:deep(.p-page-main) {
  height: 100%;
}

.p-404 {
  display: flex;
  min-height: 100%;
}

.p-404-content {
  margin: auto;
  padding: 0.75rem;
  text-align: center;
}

.p-404-title {
  font-size: 3rem;
  color: hsl(var(--pui-muted-foreground));
}

.p-404-text {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  color: hsl(var(--pui-muted-foreground));
}
</style>
