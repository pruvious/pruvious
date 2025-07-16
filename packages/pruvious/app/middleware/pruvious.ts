import {
  extractLanguageCode,
  preloadTranslatableStringsForPath,
  refreshAuthState,
  resolvePruviousRoute,
  useLanguage,
} from '#pruvious/client'

/**
 * Pruvious client middleware that combines the following middleware in parallel:
 *
 * 1. `pruvious-auth`
 * 2. `pruvious-i18n`
 * 3. `pruvious-route`
 *
 * It does the following:
 *
 * - Retrieves the current user authentication state from `/<pruvious.api.basePath>/auth/state`
 *   and stores it in the `useAuth` composable.
 * - Extracts and sets the current language code from the URL path.
 * - Preloads the required translations.
 * - Resolves the current route based on the URL path and stores it in the `usePruviousRoute` composable.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  useLanguage().value = extractLanguageCode(to.path)

  const [_1, _2, redirect] = await Promise.all([
    import.meta.client ? refreshAuthState() : Promise.resolve(),
    preloadTranslatableStringsForPath(to.path),
    resolvePruviousRoute(to),
  ])

  if (redirect) {
    return navigateTo(redirect.to, redirect)
  }
})
