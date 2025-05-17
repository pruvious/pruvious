import {
  dashboardBasePath,
  filterStylesheets,
  hasPermission,
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
import type { LanguageCode } from '#pruvious/server'
import { getCleanupDashboardStylesheetsScript } from '../dashboard/stylesheets'

/**
 * Pruvious client middleware intended for use in the dashboard.
 *
 * - Removes unwanted styles from the dashboard (in production mode).
 * - Retrieves the CMS state from `/<pruvious.api.basePath>/pruvious` and stores it in the `usePruvious` composable.
 * - Retrieves the current user authentication state from `/<pruvious.api.basePath>/auth/state`
 *   and stores it in the `useAuth` composable.
 * - Retrieves the dashboard state from `/<pruvious.api.basePath>/dashboard` and stores it in the `usePruviousDashboard` composable.
 * - Extracts and sets the current language code from the `dashboardLanguage` value of the current user.
 *   - If the user is not logged in, the primary language is used.
 * - Preloads the required translations.
 */
export const dashboardDefaultMiddleware = async () => {
  if (import.meta.client) {
    // Disable unwanted stylesheets
    if (!import.meta.dev && !document.getElementById('pruvious-dashboard-stylesheets-filter')) {
      const script = document.createElement('script')
      script.id = 'pruvious-dashboard-stylesheets-filter'
      script.innerHTML = getCleanupDashboardStylesheetsScript(filterStylesheets, dashboardBasePath)
      document.head.appendChild(script)
    }

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
      auth.value.isLoggedIn && hasPermission('update-account') && isValidLanguageCode(auth.value.user!.contentLanguage)
        ? auth.value.user.contentLanguage
        : (useDashboardContentLanguage().value ??
          (isValidLanguageCode(localStorage.getItem('contentLanguage'))
            ? (localStorage.getItem('contentLanguage') as LanguageCode)
            : primaryLanguage))

    useLanguage().value = dashboardLanguage as any
    useDashboardContentLanguage().value = contentLanguage

    await preloadTranslatableStrings('pruvious-dashboard', dashboardLanguage as any)
  }
}
