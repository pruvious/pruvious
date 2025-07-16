<template>
  <NuxtLayout name="pruvious-dashboard-blank-layout" />
</template>

<script lang="ts" setup>
import { dashboardBasePath, dashboardMiddleware, useAuth } from '#pruvious/client'

definePageMeta({
  path: dashboardBasePath,
  middleware: [(to) => dashboardMiddleware(to, 'default')],
})

const { isLoggedIn } = useAuth().value

if (isLoggedIn) {
  await navigateTo(dashboardBasePath + 'overview', { replace: true })
} else {
  await navigateTo(dashboardBasePath + 'login', { replace: true })
}
</script>
