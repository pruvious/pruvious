<template></template>

<script lang="ts" setup>
import { __, dashboardBasePath, usePruviousDashboard } from '#pruvious/client'

definePageMeta({
  path: dashboardBasePath + 'logs',
  middleware: [
    'pruvious-dashboard',
    'pruvious-dashboard-auth-guard',
    (to) => {
      const dashboard = usePruviousDashboard()
      let redirect: string | undefined

      if (dashboard.value?.logs?.api) {
        redirect = 'logs/requests'
      } else if (dashboard.value?.logs?.queries) {
        redirect = 'logs/queries'
      } else if (dashboard.value?.logs?.queue) {
        redirect = 'logs/queue'
      } else if (dashboard.value?.logs?.custom) {
        redirect = 'logs/custom'
      }

      if (redirect) {
        return navigateTo(dashboardBasePath + redirect)
      } else {
        puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
          type: 'error',
          description: __('pruvious-dashboard', 'You do not have permission to access the page `$page`', {
            page: to.path,
          }),
          showAfterRouteChange: true,
        })
        return navigateTo(dashboardBasePath + 'overview')
      }
    },
  ],
})
</script>
