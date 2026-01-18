import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'
import type { RouteLocationNormalizedGeneric } from 'vue-router'

export default function (to: RouteLocationNormalizedGeneric) {
  return dashboardMiddleware(to, ({ __, puiQueueToast, getSingletonBySlug }) => {
    const singleton = getSingletonBySlug(to.params.singleton)

    if (!singleton || singleton.definition.ui.hidden) {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'Page not found'),
        showAfterRouteChange: true,
      })
      return navigateTo(dashboardBasePath + 'overview')
    }
  })
}
