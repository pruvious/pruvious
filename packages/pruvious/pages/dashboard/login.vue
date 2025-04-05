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
import { __, dashboardBasePath, dashboardMiddleware } from '#pruvious/client'
import { isString, withoutLeadingSlash, withoutTrailingSlash } from '@pruvious/utils'

definePageMeta({
  path: dashboardBasePath + 'login',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'guest-guard'),
    (to) =>
      dashboardMiddleware(to, ({ usePruvious }) => {
        if (!usePruvious().value?.installed) {
          return navigateTo(dashboardBasePath + 'install', { replace: true })
        }
      }),
  ],
})

useHead({
  title: __('pruvious-dashboard', 'Login'),
})
</script>
