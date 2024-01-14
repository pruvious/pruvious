import { addRouteMiddleware, navigateTo } from '#imports'
import { useAuth } from '../../../composables/auth'
import { navigateToPruviousDashboardPath, usePruviousDashboard } from '../../../composables/dashboard/dashboard'
import { useUser } from '../../../composables/user'
import { getCapabilities } from '../../../utils/users'

export default addRouteMiddleware('pruvious-dashboard-root-guard', (to) => {
  const auth = useAuth()
  const dashboard = usePruviousDashboard()
  const user = useUser()

  if (!dashboard.value.installed) {
    return navigateToPruviousDashboardPath('/install', { replace: true })
  } else if (auth.value.isLoggedIn) {
    let language = to.query.language as string | undefined

    return user.value?.isAdmin || getCapabilities(user.value)['access-dashboard']
      ? navigateTo(
          dashboard.value.menu[0]?.path
            ? dashboard.value.menu[0]?.path.includes('/collections/')
              ? dashboard.value.menu[0]?.path + (language ? `?where=language[=][${language}]` : '')
              : dashboard.value.menu[0]?.path
            : '/profile',
          { replace: true },
        )
      : navigateToPruviousDashboardPath('/forbidden', { replace: true }, to)
  } else {
    return navigateToPruviousDashboardPath('/login', { replace: true, to: to.query.to || to.fullPath }, to)
  }
})
