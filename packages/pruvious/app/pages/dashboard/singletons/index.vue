<template></template>

<script lang="ts" setup>
import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'

definePageMeta({
  path: dashboardBasePath + 'singletons',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      import('../../../utils/pruvious/dashboard/middleware/singletons/index').then(({ default: middleware }) =>
        middleware(to),
      ),
  ],
})
</script>
