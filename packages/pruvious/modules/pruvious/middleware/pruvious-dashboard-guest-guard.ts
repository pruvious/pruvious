import { dashboardBasePath, useAuth } from '#pruvious/client'

/**
 * Pruvious client middleware that guards against logged-in users.
 * It is intended for use in the dashboard.
 */
export const dashboardGuestGuard = () => {
  if (import.meta.client) {
    const { isLoggedIn } = useAuth().value

    if (isLoggedIn) {
      return navigateTo(dashboardBasePath + 'overview')
    }
  }
}
