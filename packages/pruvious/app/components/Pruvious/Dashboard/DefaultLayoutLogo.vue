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
  height: 2.25rem;
  margin: -0.25rem;
  padding: 0.25rem;
  border-radius: calc(var(--pui-radius) - 0.125rem);
  color: hsl(var(--pui-card));
  filter: brightness(0.8);
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.p-logo:focus-visible,
.p-logo-focus-visible {
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
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
