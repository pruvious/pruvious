import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'
import type { Permission } from '#pruvious/server'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import type { RouteLocationNormalizedGeneric } from 'vue-router'

export default function (to: RouteLocationNormalizedGeneric) {
  return dashboardMiddleware(to, ({ __, getCollectionBySlug, hasPermission, puiQueueToast }) => {
    const collection = getCollectionBySlug(to.params.collection)
    const id = castToNumber(to.params.id)

    if (
      !collection ||
      (!collection.definition.api.update && !collection.definition.api.read) ||
      collection.definition.ui.hidden
    ) {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'Page not found'),
        showAfterRouteChange: true,
      })
      return navigateTo(dashboardBasePath + 'overview')
    } else if (!isPositiveInteger(id)) {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'Page not found'),
        showAfterRouteChange: true,
      })
      return navigateTo(dashboardBasePath + `collections/${to.params.collection}`)
    } else if (!hasPermission(`collection:${to.params.collection}:read` as Permission)) {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'You do not have permission to access the page `$page`', {
          page: to.path,
        }),
        showAfterRouteChange: true,
      })
      return navigateTo(dashboardBasePath + `collections/${to.params.collection}`)
    }
  })
}
