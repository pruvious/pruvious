import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'
import type { RouteLocationNormalizedGeneric } from 'vue-router'

export default function (to: RouteLocationNormalizedGeneric) {
  return dashboardMiddleware(to, ({ __, getCollectionBySlug, puiQueueToast }) => {
    const collection = getCollectionBySlug(to.params.collection)

    if (!collection || collection.definition.ui.hidden) {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'Page not found'),
        showAfterRouteChange: true,
      })
      return navigateTo(dashboardBasePath + 'overview')
    }
  })
}
