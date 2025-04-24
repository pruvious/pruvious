<template>
  <NuxtLink :title="__('pruvious-dashboard', 'Go back home')" :to="link" class="p-logo pui-raw">
    <PruviousDashboardLogoMark />
  </NuxtLink>
</template>

<script lang="ts" setup>
import { __, dashboardBasePath } from '#pruvious/client'
import { withoutTrailingSlash } from '@pruvious/utils'

const link = withoutTrailingSlash(dashboardBasePath)
</script>

<style scoped>
.p-logo {
  display: block;
  width: auto;
  height: 1.75rem;
  color: hsl(var(--pui-card));
  filter: brightness(0.8);
}

.dark .p-logo {
  filter: brightness(1.5);
}

.p-logo :deep(svg) {
  display: block;
  width: auto;
  height: 100%;
}
</style>
