import type { LanguageCode } from '#pruvious/server'
import type {
  ExtractDomains,
  ExtractLanguagesByDomain,
  ExtractTranslatableStringsDefinitions,
  TranslatableStrings,
} from '@pruvious/i18n'
import type { PathMatcher } from '@pruvious/utils/path-matcher'

const matchers: Record<string, PathMatcher> = {}

/**
 * Composable that provides access to the active language code for the current page or dashboard UI.
 * The language is determined and set automatically through either the `pruvious-i18n` or `pruvious` middleware.
 */
export const useLanguage = () => useState<LanguageCode>('pruvious-language', () => null as any)

/**
 * Composable that provides access to the active language code used for collection records and singletons in the dashboard.
 * The language is manually selected by users through the dashboard interface and persisted in their `dashboard` settings.
 */
export const useDashboardContentLanguage = () =>
  useState<LanguageCode>('pruvious-dashboard-content-language', () => null as any)

/**
 * Extracts the language code from a URL path.
 *
 * Checks the first segment of the provided `path` and returns the corresponding language code if it matches a language configured in the CMS.
 * If no match is found, it returns the primary language code.
 *
 * @example
 * ```ts
 * // Given the following languages in your Nuxt config:
 * // pruvious: {
 * //   i18n: {
 * //     languages: [
 * //       { name: 'English', code: 'en' },
 * //       { name: 'Deutsch', code: 'de' },
 * //       { name: 'Français', code: 'fr' },
 * //     ],
 * //     primaryLanguage: 'en',
 * //     prefixPrimaryLanguage: false,
 * //   },
 * // }
 *
 * extractLanguageCode('/about')    // => 'en'
 * extractLanguageCode('/de/about') // => 'de'
 * extractLanguageCode('/fr/about') // => 'fr'
 * extractLanguageCode('/es/about') // => 'en'
 * ```
 */
export function extractLanguageCode(path: string): LanguageCode {
  const { primaryLanguage } = useRuntimeConfig().public.pruvious
  // @todo implement
  return primaryLanguage as LanguageCode
}

/**
 * Preloads translatable strings for a given `domain` and `language`.
 *
 * You can also configure preloading in your Nuxt config (`pruvious.i18n.preloadTranslatableStrings`).
 *
 * @example
 * ```vue
 * <script lang="ts" setup>
 * import { __, preloadTranslatableStrings } from '#pruvious/client'
 *
 * await preloadTranslatableStrings('my-domain')
 *
 * const helloTranslated = __('my-domain', 'Hello!')
 * </script>
 * ```
 */
export async function preloadTranslatableStrings<
  TDomain extends ExtractDomains<ExtractTranslatableStringsDefinitions<typeof i18n>>,
  TLanguage extends ExtractLanguagesByDomain<TDomain, ExtractTranslatableStringsDefinitions<typeof i18n>>,
>(domain: TDomain, language: TLanguage): Promise<TranslatableStrings> {
  const { i18n } = await import('#pruvious/client')

  if (!i18n.hasDefinition(domain, language)) {
    const { apiBasePath } = useRuntimeConfig().public.pruvious
    const nuxtApp = useNuxtApp()
    const handler = () => $fetch<TranslatableStrings>(apiBasePath + 'translations', { query: { domain, language } })
    const strings = nuxtApp.isHydrating
      ? await useAsyncData(`pruvious:translations:${domain}:${language}`, handler, {
          getCachedData: (key, nuxt) => nuxt.payload.data[key] || nuxt.static.data[key],
          dedupe: 'defer',
        }).then(({ data }) => data.value ?? {})
      : await handler()

    i18n.defineTranslatableStrings({ domain, language, strings })
  }

  return i18n.getDefinition(domain, language)!.strings
}

/**
 * Preloads translatable strings for a specified `path` according to the
 * `pruvious.i18n.preloadTranslatableStrings` options in `nuxt.config.ts`.
 *
 * This function is used in the client middleware `pruvious-i18n` and `pruvious`.
 */
export async function preloadTranslatableStringsForPath(path: string) {
  const language = useLanguage().value
  const { translatableStringsPreloadRules } = useRuntimeConfig().public.pruvious
  const { PathMatcher } = await import('@pruvious/utils/path-matcher')

  for (const [domain, { include, exclude }] of Object.entries(translatableStringsPreloadRules)) {
    if (!matchers[domain]) {
      matchers[domain] = new PathMatcher({ include, exclude })
    }

    if (matchers[domain].test(path)) {
      await preloadTranslatableStrings(domain as any, language as any)
    }
  }
}
