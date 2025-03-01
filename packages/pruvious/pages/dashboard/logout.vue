<template>
  <NuxtLayout name="pruvious-dashboard-blank-layout" />
</template>

<script lang="ts" setup>
import {
  dashboardBasePath,
  pruviousDashboardPost,
  refreshPruviousDashboardState,
  removeAuthToken,
  usePruviousDashboardLayout,
  usePruviousDashboardMenuExpanded,
} from '#pruvious/client'

definePageMeta({
  path: dashboardBasePath + 'logout',
  middleware: ['pruvious-dashboard', 'pruvious-dashboard-auth-guard'],
})

await pruviousDashboardPost('auth/logout', {}).finally(removeAuthToken)
await navigateTo(dashboardBasePath + 'login')
await refreshPruviousDashboardState(true)

usePruviousDashboardMenuExpanded().value = {}
usePruviousDashboardLayout().value = {
  sidebarExpanded: false,
  sidebarScrollY: 0,
  sidebarContentHeight: 0,
}
</script>
