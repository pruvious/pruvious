import { dashboardBasePath } from '#pruvious/dashboard/base'
import { useAuth } from '../auth/utils.client'
import type { RouteLocationNormalized } from 'vue-router'
/**
 * Pruvious client middleware that guards against non-logged-in users and users without the `access-dashboard` permission.
 * It is intended for use in the dashboard.
 */
export const dashboardAuthGuard = (to: RouteLocationNormalized) => {
  const runtimeConfig = useRuntimeConfig()
  const { isLoggedIn, permissions } = useAuth().value

  if (to.fullPath.startsWith(runtimeConfig.public.pruvious.apiBasePath)) {
    return abortNavigation()
  }

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
