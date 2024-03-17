import { addRouteMiddleware, navigateTo, useNuxtApp, useRouter, useRuntimeConfig } from '#imports'
import {
  dashboardCollectionsOverviewComponentImport,
  dashboardCollectionsRecordComponentImport,
  dashboardInstallComponentImport,
  dashboardLoginComponentImport,
  dashboardLogoutComponentImport,
  dashboardMediaComponentImport,
  dashboardPageComponentImports,
} from '#pruvious/dashboard'
import { isDevelopment, isProduction } from 'std-env'
import { useAuth } from '../../../composables/auth'
import {
  navigateToPruviousDashboardPath,
  registerDynamicPruviousDashboardPlugins,
  updatePruviousDashboard,
  usePruviousDashboard,
} from '../../../composables/dashboard/dashboard'
import { setLanguage } from '../../../composables/language'
import { useUser } from '../../../composables/user'
import { pruviousFetch } from '../../../utils/fetch'
import { slugify } from '../../../utils/slugify'
import { joinRouteParts } from '../../../utils/string'
import('./access-guard')
import('./collection-guard')
import('./fetch-directories')
import('./uploads-directory-guard')
import('./fresh-guard')
import('./guest-guard')
import('./installed-guard')
import('./root-guard')
import('./read-uploads-guard')

let unwantedStylesRemoved = false

export default addRouteMiddleware('pruvious-dashboard-before-all', async (to) => {
  const auth = useAuth()
  const nuxtApp = useNuxtApp()
  const router = useRouter()
  const runtimeConfig = useRuntimeConfig()
  const dashboard = usePruviousDashboard()
  const user = useUser()

  if (runtimeConfig.public.pruvious.dashboardRemoveSiteStyles && !unwantedStylesRemoved) {
    for (const styleSheet of document.styleSheets) {
      const devId = (styleSheet.ownerNode as HTMLElement)?.dataset?.viteDevId

      if (isProduction || !devId?.includes('node_modules')) {
        styleSheet.ownerNode?.remove()
      }
    }

    if (isDevelopment) {
      for (const styleElement of document.querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id]')) {
        if (!styleElement.dataset.viteDevId?.match(/[\/\\]pruvious[\/\\]dist[\/\\]/)) {
          styleElement.remove()
        }
      }
    }

    unwantedStylesRemoved = true
  }

  if (auth.value.isLoggedIn && !user.value) {
    const response = await pruviousFetch('profile.get')

    if (response.success) {
      user.value = response.data
      setLanguage(user.value.dashboardLanguage!, { reloadTranslatableStrings: false })
    } else {
      auth.value.isLoggedIn = false
      auth.value.userId = null
    }
  }

  registerDynamicPruviousDashboardPlugins(nuxtApp)

  await updatePruviousDashboard(to)

  if (dashboard.value.refresh) {
    const dashboardOptions = await pruviousFetch('dashboard.get')
    dashboard.value = { ...dashboard.value, ...(dashboardOptions.success ? dashboardOptions.data : {}), refresh: false }

    for (const { path } of dashboard.value.menu.filter(({ collection }) => !collection)) {
      const name = `pruvious-dashboard-page-${slugify(path)}`

      if (!router.hasRoute(name)) {
        router.addRoute({
          name,
          path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, path),
          component: dashboardPageComponentImports[path as keyof typeof dashboardPageComponentImports],
          meta: { middleware: ['pruvious-dashboard-before-all', 'pruvious-dashboard-access-guard'] },
        })
      }
    }
  }

  if (!dashboard.value.loaded) {
    const dashboardOptions = await pruviousFetch('dashboard.get')

    router.removeRoute('pruvious-dashboard')

    router.addRoute({
      name: 'pruvious-dashboard-root',
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix),
      component: () => import('../../../pages/dashboard/index.vue'),
      meta: { middleware: ['pruvious-dashboard-before-all', 'pruvious-dashboard-root-guard'] },
    })

    router.addRoute({
      name: 'pruvious-dashboard-install',
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, 'install'),
      component: dashboardInstallComponentImport,
      meta: { middleware: ['pruvious-dashboard-before-all', 'pruvious-dashboard-fresh-guard'] },
    })

    router.addRoute({
      name: 'pruvious-dashboard-login',
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, 'login'),
      component: dashboardLoginComponentImport,
      meta: {
        middleware: [
          'pruvious-dashboard-before-all',
          'pruvious-dashboard-installed-guard',
          'pruvious-dashboard-guest-guard',
        ],
      },
    })

    router.addRoute({
      name: 'pruvious-dashboard-logout',
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, 'logout'),
      component: dashboardLogoutComponentImport,
      meta: {
        middleware: ['pruvious-dashboard-before-all', 'pruvious-dashboard-access-guard'],
      },
    })

    router.addRoute({
      name: 'pruvious-dashboard-collection-overview',
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, 'collections/:collection'),
      component: dashboardCollectionsOverviewComponentImport,
      meta: {
        middleware: [
          'pruvious-dashboard-before-all',
          'pruvious-dashboard-access-guard',
          'pruvious-dashboard-collection-guard',
        ],
      },
    })

    router.addRoute({
      name: 'pruvious-dashboard-collection-record',
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, 'collections/:collection/:recordId'),
      component: dashboardCollectionsRecordComponentImport,
      meta: {
        middleware: [
          'pruvious-dashboard-before-all',
          'pruvious-dashboard-access-guard',
          'pruvious-dashboard-collection-guard',
        ],
      },
    })

    router.addRoute({
      name: 'pruvious-dashboard-profile',
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, 'profile'),
      component: () => import('../../../pages/dashboard/profile.vue'),
      meta: {
        middleware: ['pruvious-dashboard-before-all', 'pruvious-dashboard-access-guard'],
      },
    })

    router.addRoute({
      name: 'pruvious-dashboard-media',
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, 'media', ':catchAll(.*)?'),
      component: dashboardMediaComponentImport,
      meta: {
        middleware: [
          'pruvious-dashboard-before-all',
          'pruvious-dashboard-access-guard',
          'pruvious-read-uploads-guard',
          'pruvious-fetch-directories',
          'pruvious-uploads-directory-guard',
        ],
      },
    })

    dashboard.value = { ...dashboard.value, ...(dashboardOptions.success ? dashboardOptions.data : {}) }
    dashboard.value.loaded = true

    for (const { path } of dashboard.value.menu.filter(({ collection }) => !collection)) {
      router.addRoute({
        name: `pruvious-dashboard-page-${slugify(path)}`,
        path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, path),
        component: dashboardPageComponentImports[path as keyof typeof dashboardPageComponentImports],
        meta: { middleware: ['pruvious-dashboard-before-all', 'pruvious-dashboard-access-guard'] },
      })
    }

    router.addRoute({
      name: 'pruvious-dashboard-forbidden',
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, 'forbidden'),
      component: () => import('../../../pages/dashboard/forbidden.vue'),
      meta: { middleware: ['pruvious-dashboard-before-all'] },
    })

    router.addRoute({
      name: 'pruvious-dashboard-catch-all',
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, ':catchAll(.+)'),
      component: () => import('../../../pages/dashboard/catch-all.vue'),
      meta: { middleware: ['pruvious-dashboard-before-all'] },
    })

    return navigateToPruviousDashboardPath('/', { replace: true, to: to.query.to || to.fullPath }, to)
  }

  if (auth.value.isLoggedIn && to.query.to) {
    return navigateTo({ path: to.query.to.toString(), query: { ...to.query, to: undefined } }, { replace: true })
  }
})
