import { addRouteMiddleware } from '#imports'
import { navigateToPruviousDashboardPath, usePruviousDashboard } from '../../../composables/dashboard/dashboard'

export default addRouteMiddleware('pruvious-dashboard-collection-guard', (to) => {
  const dashboard = usePruviousDashboard()

  if (!dashboard.value.collections[to.params.collection.toString()]?.dashboard.visible) {
    return navigateToPruviousDashboardPath(`/404?from=${to.fullPath}`, { replace: true })
  }
})
