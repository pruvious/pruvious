<template>
  <NuxtLayout name="pruvious-dashboard-blank-layout" />
</template>

<script lang="ts" setup>
import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'

definePageMeta({
  path: dashboardBasePath,
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => import('../../utils/pruvious/dashboard/middleware/index').then((m) => m.default(to)),
  ],
})
</script>
