import { dashboardBasePath, useAuth } from '#pruvious/client'
import type { RouteLocationNormalized } from 'vue-router'
/**
 * Pruvious client middleware that guards against non-logged-in users and users without the `access-dashboard` permission.
 * It is intended for use in the dashboard.
 */
export const dashboardAuthGuard = (to: RouteLocationNormalized) => {
  const { isLoggedIn, permissions } = useAuth().value

  if (!isLoggedIn) {
    let query = ''

    if (to.fullPath.startsWith(dashboardBasePath) && to.fullPath !== dashboardBasePath) {
      query = '?redirect=' + encodeURIComponent(to.fullPath.slice(dashboardBasePath.length))
    }

    return navigateTo(dashboardBasePath + 'login' + query)
  }

  if (!permissions.includes('access-dashboard')) {
    if ((dashboardBasePath as string) === '/') {
      return abortNavigation()
    } else {
      return navigateTo('/')
    }
  }
}
