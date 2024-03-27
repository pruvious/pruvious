<template>
  <div>
    <PruviousLoadingIndicator />
    <PruviousToaster />
    <component :is="dashboardHeadComponent()" />
  </div>
</template>

<script lang="ts" setup>
import { dashboardHeadComponent, dashboardMiscComponent } from '#pruvious/dashboard'

const PruviousLoadingIndicator = dashboardMiscComponent.LoadingIndicator()
const PruviousToaster = dashboardMiscComponent.Toaster()
</script>
