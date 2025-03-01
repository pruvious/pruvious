import {
  isValidLanguageCode,
  preloadTranslatableStrings,
  primaryLanguage,
  refreshAuthState,
  refreshPruviousDashboardState,
  refreshPruviousState,
  useAuth,
  useDashboardContentLanguage,
  useLanguage,
} from '#pruvious/client'

/**
 * Pruvious client middleware intended for use in the dashboard.
 *
 * - Retrieves the CMS state from `/<pruvious.api.basePath>/pruvious` and stores it in the `usePruvious` composable.
 * - Retrieves the current user authentication state from `/<pruvious.api.basePath>/auth/state`
 *   and stores it in the `useAuth` composable.
 * - Retrieves the dashboard state from `/<pruvious.api.basePath>/dashboard` and stores it in the `usePruviousDashboard` composable.
 * - Extracts and sets the current language code from the `dashboardLanguage` value of the current user.
 *   - If the user is not logged in, the primary language is used.
 * - Preloads the required translations.
 */
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.client) {
    // CMS
    await refreshPruviousState()

    // Auth
    await refreshAuthState()

    // Dashboard
    await refreshPruviousDashboardState()

    // Translations
    const auth = useAuth()
    const dashboardLanguage =
      auth.value.isLoggedIn && isValidLanguageCode(auth.value.user!.dashboardLanguage)
        ? auth.value.user.dashboardLanguage
        : (useLanguage().value ?? 'en')
    const contentLanguage =
      auth.value.isLoggedIn && isValidLanguageCode(auth.value.user!.contentLanguage)
        ? auth.value.user.contentLanguage
        : (useDashboardContentLanguage().value ?? primaryLanguage)

    useLanguage().value = dashboardLanguage as any
    useDashboardContentLanguage().value = contentLanguage

    await preloadTranslatableStrings('pruvious-dashboard', dashboardLanguage as any)
  }
})
