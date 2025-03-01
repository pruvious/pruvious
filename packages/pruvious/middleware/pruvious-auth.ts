import { refreshAuthState } from '#pruvious/client'

/**
 * Pruvious client middleware responsible for authentication.
 *
 * - Retrieves the current user authentication state from `/<pruvious.api.basePath>/auth/state`
 *   and stores it in the `useAuth` composable.
 */
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.client) {
    await refreshAuthState()
  }
})
