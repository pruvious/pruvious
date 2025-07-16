import type { _, __, LanguageCode } from '#pruvious/server'
import {
  createPattern as _createPattern,
  type ExtractPlaceholders,
  type Pattern,
  type Replacement,
} from '@pruvious/i18n'
import { isDefined } from '@pruvious/utils'
import parser from 'accept-language-parser'
import type { PruviousModuleOptions, ResolvedI18nConfig } from '../PruviousModuleOptions'

export type TranslatableStringCallbackContext = {
  /**
   * Retrieves a translated string for a given `domain` and `handle`, with optional `input` parameters.
   * The language is automatically resolved.
   *
   * @example
   * ```ts
   * __('custom-domain', 'Delete')
   * // EN: 'Delete'
   * // DE: 'Löschen'
   *
   * __('custom-domain', 'Delete $count $entries', { count: 1 })
   * // EN: 'Delete 1 entry'
   * // DE: '1 Eintrag löschen'
   * ```
   */
  _: typeof _

  /**
   * A shorthand method for retrieving translated strings from the `default` domain.
   * This method is equivalent to calling `__` with `default` as the domain.
   * The language is automatically resolved.
   *
   * @example
   * ```ts
   * _('Submit')
   * // EN: 'Submit'
   * // DE: 'Absenden'
   *
   * _('Unsubscribe from $type newsletter', { type: 'Pruvious' })
   * // EN: 'Unsubscribe from Pruvious newsletter'
   * // DE: 'Vom Pruvious-Newsletter abmelden'
   * ```
   */
  __: typeof __
}

export type TranslatableStringCallback = (context: TranslatableStringCallbackContext) => string

/**
 * Creates a new translatable string pattern.
 *
 * @example
 * ```ts
 * // server/translations/de.ts
 * import { createPattern, defineTranslation } from '#pruvious/server'
 *
 * export default defineTranslation({
 *   'Displayed: $count entries': createPattern(
 *     // Translated text pattern
 *     'Angezeigt: $count $entries',
 *
 *     // Required user inputs
 *     {
 *       count: 'number',
 *     },
 *
 *     // Conditional replacements
 *     {
 *       entries: [
 *         { conditions: [{ count: 1 }], output: 'Eintrag' },
 *         'Einträge',
 *       ],
 *     },
 *   ),
 * })
 *
 * // Usage example:
 * _('de', 'Displayed: $count entries', { count: 1 }) // 'Angezeigt: 1 Eintrag'
 * _('de', 'Displayed: $count entries', { count: 2 }) // 'Angezeigt: 2 Einträge'
 * ```
 */
export function createPattern<
  TTranslation extends string,
  TInput extends Partial<Record<ExtractPlaceholders<TTranslation> | (string & {}), 'boolean' | 'number' | 'string'>>,
>(
  translation: TTranslation,
  input: TInput,
  replacements?: Partial<
    Record<ExtractPlaceholders<TTranslation> | (string & {}), (string | Replacement<TInput & Record<string, any>>)[]>
  >,
): Pattern<TTranslation, TInput & Record<string, any>> {
  return _createPattern(translation, input, replacements)
}

/**
 * Resolves the `i18n` option from the `PruviousModuleOptions` to a `ResolvedI18nConfig` objects.
 */
export function resolveTranslationsConfig(i18n?: PruviousModuleOptions['i18n']): ResolvedI18nConfig {
  const config: ResolvedI18nConfig = {
    languages: [
      {
        name: 'English',
        code: 'en',
      },
    ],
    primaryLanguage: 'en',
    prefixPrimaryLanguage: false,
    fallbackLanguages: ['en'],
    preloadTranslatableStrings: {
      default: {
        include: ['**'],
        exclude: [],
      },
    },
  }

  if (i18n?.primaryLanguage) {
    config.primaryLanguage = i18n?.primaryLanguage
  }

  if (i18n?.languages) {
    config.languages = i18n?.languages.map((language) => ({
      name: language.name,
      code: language.code,
    }))
  }

  if (isDefined(i18n?.prefixPrimaryLanguage)) {
    config.prefixPrimaryLanguage = i18n?.prefixPrimaryLanguage
  }

  if (i18n?.fallbackLanguages) {
    config.fallbackLanguages = i18n?.fallbackLanguages
  }

  if (i18n?.preloadTranslatableStrings) {
    config.preloadTranslatableStrings = {
      ...config.preloadTranslatableStrings,
      ...Object.fromEntries(
        Object.entries(i18n?.preloadTranslatableStrings).map(([key, value]) => [
          key,
          {
            include: value === true ? ['**'] : value === false ? [] : (value.include ?? ['**']),
            exclude: value === true ? [] : value === false ? [] : (value.exclude ?? []),
          },
        ]),
      ),
    }
  }

  return config
}

/**
 * Resolves the context language based on the `Accept-Language` header.
 * The language code is stored in `event.context.pruvious.language`.
 */
export async function resolveContextLanguage() {
  const event = useEvent()
  const { languages, primaryLanguage } = await import('#pruvious/server')

  event.context.pruvious ??= {} as any
  event.context.pruvious.language =
    parser.pick(
      languages.map(({ code }) => code),
      getHeader(event, 'Accept-Language') ?? '',
      { loose: true },
    ) || primaryLanguage

  return event.context.pruvious.language
}

/**
 * Verifies if a language `code` exists in the configured languages list.
 * The function checks against the language codes defined in the `pruvious.i18n.languages` array within `nuxt.config.ts`.
 */
export function isValidLanguageCode(code: unknown): code is LanguageCode {
  return useRuntimeConfig().pruvious.i18n.languages.some((language) => language.code === code)
}
