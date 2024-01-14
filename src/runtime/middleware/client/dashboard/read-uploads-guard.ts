import { addRouteMiddleware } from '#imports'
import { useAuth } from '../../../composables/auth'
import { navigateToPruviousDashboardPath } from '../../../composables/dashboard/dashboard'
import { useUser } from '../../../composables/user'
import { getCapabilities } from '../../../utils/users'

export default addRouteMiddleware('pruvious-read-uploads-guard', (to) => {
  const auth = useAuth()
  const user = useUser()

  if (!auth.value.isLoggedIn || (!user.value?.isAdmin && !getCapabilities(user.value)['collection-uploads-read'])) {
    return navigateToPruviousDashboardPath('/', { replace: true })
  }
})
