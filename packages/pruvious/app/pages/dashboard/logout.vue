<template>
  <NuxtLayout name="pruvious-dashboard-blank-layout" />
</template>

<script lang="ts" setup>
import { removeAuthToken } from '#pruvious/app'
import {
  dashboardBasePath,
  dashboardMiddleware,
  pruviousDashboardPost,
  refreshPruviousDashboardState,
  useDashboardLayout,
  useDashboardMenuExpanded,
} from '#pruvious/dashboard'

definePageMeta({
  path: dashboardBasePath + 'logout',
  middleware: [(to) => dashboardMiddleware(to, 'default'), (to) => dashboardMiddleware(to, 'auth-guard')],
})

await pruviousDashboardPost('auth/logout', {}).finally(removeAuthToken)
await navigateTo(dashboardBasePath + 'login')
await refreshPruviousDashboardState(true)

useDashboardMenuExpanded().value = {}
useDashboardLayout().value = {
  sidebarExpanded: false,
  sidebarScrollY: 0,
  sidebarContentHeight: 0,
}
</script>
