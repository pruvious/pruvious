<template>
  <NuxtLayout name="pruvious-dashboard-auth-layout">
    <template #header>
      <PruviousDashboardAuthLayoutLogo />
    </template>

    <PUICard>
      <PruviousDashboardLogin
        :redirect="
          dashboardBasePath +
          (isString($route.query.redirect)
            ? withoutLeadingSlash(withoutTrailingSlash($route.query.redirect))
            : 'overview')
        "
      />
    </PUICard>
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'
import { isString, withoutLeadingSlash, withoutTrailingSlash } from '@pruvious/utils'

definePageMeta({
  path: dashboardBasePath + 'login',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'guest-guard'),
    (to) => import('../../utils/pruvious/dashboard/middleware/login').then((m) => m.default(to)),
  ],
})

useHead({
  title: __('pruvious-dashboard', 'Login'),
})
</script>
