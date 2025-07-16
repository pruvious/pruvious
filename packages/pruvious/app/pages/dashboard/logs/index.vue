<template></template>

<script lang="ts" setup>
import { dashboardBasePath, dashboardMiddleware } from '#pruvious/client'

definePageMeta({
  path: dashboardBasePath + 'logs',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      dashboardMiddleware(to, ({ __, puiQueueToast, usePruviousDashboard }) => {
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
      }),
  ],
})
</script>
