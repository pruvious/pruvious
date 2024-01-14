import { addRouteMiddleware } from '#imports'
import { useAuth } from '../../../composables/auth'
import { navigateToPruviousDashboardPath } from '../../../composables/dashboard/dashboard'

export default addRouteMiddleware('pruvious-dashboard-guest-guard', () => {
  const auth = useAuth()

  if (auth.value.isLoggedIn) {
    return navigateToPruviousDashboardPath('/', { replace: true })
  }
})
