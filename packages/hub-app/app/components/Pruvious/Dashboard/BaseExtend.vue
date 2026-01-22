<template>
  <slot />
</template>

<script lang="ts" setup>
import { preloadTranslatableStrings } from '#pruvious/app'
import { useDashboardContentLanguage } from '#pruvious/dashboard'

const dashboardLanguage = useDashboardContentLanguage()

await preloadTranslatableStrings('default', dashboardLanguage.value)
</script>
