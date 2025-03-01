<template></template>

<script lang="ts" setup>
import { __, dashboardBasePath, usePruviousDashboard } from '#pruvious/client'
import { isEmpty, slugify } from '@pruvious/utils'

definePageMeta({
  path: dashboardBasePath + 'singletons',
  middleware: [
    'pruvious-dashboard',
    'pruvious-dashboard-auth-guard',
    (to) => {
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
    },
  ],
})
</script>
