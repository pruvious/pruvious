<template></template>

<script lang="ts" setup>
import { dashboardBasePath, dashboardMiddleware } from '#pruvious/client'
import { isEmpty } from '@pruvious/utils'

definePageMeta({
  path: dashboardBasePath + 'singletons',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      dashboardMiddleware(to, ({ __, puiQueueToast, slugify, usePruviousDashboard }) => {
        const dashboard = usePruviousDashboard()
        let redirect: string | undefined

        if (!isEmpty(dashboard.value?.singletons)) {
          redirect = `singletons/${slugify(Object.keys(dashboard.value!.singletons)[0]!)}`
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
