import { extractLanguageCode, preloadTranslatableStringsForPath, refreshAuthState, useLanguage } from '#pruvious/client'

/**
 * Pruvious client middleware that combines the following middleware in sequential order:
 *
 * 1. `pruvious-auth`
 * 2. `pruvious-i18n`
 * 3. `pruvious-page`
 *
 * It does the following:
 *
 * - Retrieves the current user authentication state from `/<pruvious.api.basePath>/auth/state`
 *   and stores it in the `useAuth` composable.
 * - Extracts and sets the current language code from the URL path.
 * - Preloads the required translations.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // auth
  if (import.meta.client) {
    await refreshAuthState()
  }

  // i18n
  useLanguage().value = extractLanguageCode(to.path)
  await preloadTranslatableStringsForPath(to.path)

  // page
  // @todo
})
