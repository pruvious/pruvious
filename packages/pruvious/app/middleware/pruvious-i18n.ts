import { extractLanguageCode, preloadTranslatableStringsForPath, useLanguage } from '#pruvious/client'

/**
 * Pruvious client middleware responsible for resolving the current language and preloading translations.
 *
 * - Extracts and sets the current language code from the URL path.
 * - Preloads the required translations.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  useLanguage().value = extractLanguageCode(to.path)
  await preloadTranslatableStringsForPath(to.path)
})
