import { addRouteMiddleware, navigateTo, useRuntimeConfig } from '#imports'
import { useAuth } from '../../../composables/auth'
import { navigateToPruviousDashboardPath, usePruviousDashboard } from '../../../composables/dashboard/dashboard'
import { useUser } from '../../../composables/user'
import { joinRouteParts } from '../../../utils/string'
import { getCapabilities } from '../../../utils/users'

export default addRouteMiddleware('pruvious-dashboard-root-guard', (to) => {
  const auth = useAuth()
  const dashboard = usePruviousDashboard()
  const runtimeConfig = useRuntimeConfig()
  const user = useUser()

  if (!dashboard.value.installed) {
    return navigateToPruviousDashboardPath('/install', { replace: true })
  } else if (auth.value.isLoggedIn) {
    let language = to.query.language as string | undefined

    return user.value?.isAdmin || getCapabilities(user.value)['access-dashboard']
      ? navigateTo(
          dashboard.value.menu[0]?.path
            ? dashboard.value.menu[0]?.collection
              ? dashboard.value.menu[0]?.path + (language ? `?where=language[=][${language}]` : '')
              : joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, dashboard.value.menu[0]?.path)
            : joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, 'profile'),
          { replace: true },
        )
      : navigateToPruviousDashboardPath('/forbidden', { replace: true }, to)
  } else {
    return navigateToPruviousDashboardPath('/login', { replace: true, to: to.query.to || to.fullPath }, to)
  }
})
