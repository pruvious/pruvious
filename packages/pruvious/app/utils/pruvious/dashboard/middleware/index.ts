import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'
import type { RouteLocationNormalizedGeneric } from 'vue-router'

export default function (to: RouteLocationNormalizedGeneric) {
  return dashboardMiddleware(to, ({ useAuth }) => {
    const { isLoggedIn } = useAuth().value

    if (isLoggedIn) {
      return navigateTo(dashboardBasePath + 'overview', { replace: true })
    } else {
      return navigateTo(dashboardBasePath + 'login', { replace: true })
    }
  })
}
