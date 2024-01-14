<template>
  <div>
    <PruviousLoadingIndicator />
    <PruviousToaster />
    <component :is="dashboardHeadComponent()" />
  </div>
</template>

<script lang="ts" setup>
import { dashboardHeadComponent } from '#pruvious/dashboard'
</script>
