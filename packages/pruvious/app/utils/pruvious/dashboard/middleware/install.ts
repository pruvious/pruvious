import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'
import type { RouteLocationNormalizedGeneric } from 'vue-router'

export default function (to: RouteLocationNormalizedGeneric) {
  return dashboardMiddleware(to, ({ usePruvious }) => {
    if (usePruvious().value?.installed) {
      return navigateTo(dashboardBasePath + 'login', { replace: true })
    }
  })
}
