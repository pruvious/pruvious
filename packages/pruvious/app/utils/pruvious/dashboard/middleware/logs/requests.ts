import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'
import type { RouteLocationNormalizedGeneric } from 'vue-router'

export default function (to: RouteLocationNormalizedGeneric) {
  return dashboardMiddleware(to, ({ __, puiQueueToast, usePruviousDashboard }) => {
    if (!usePruviousDashboard().value?.logs?.api) {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'You do not have permission to access the page `$page`', {
          page: to.path,
        }),
        showAfterRouteChange: true,
      })
      return navigateTo(dashboardBasePath + 'overview')
    }
  })
}
