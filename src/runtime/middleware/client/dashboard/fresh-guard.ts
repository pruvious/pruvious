import { addRouteMiddleware } from '#imports'
import { navigateToPruviousDashboardPath, usePruviousDashboard } from '../../../composables/dashboard/dashboard'

export default addRouteMiddleware('pruvious-dashboard-fresh-guard', () => {
  const dashboard = usePruviousDashboard()

  if (dashboard.value.installed) {
    return navigateToPruviousDashboardPath('/', { replace: true })
  }
})
