import { deepClone, isUndefined } from '@pruvious/utils'
import { replacePlaceholders } from './placeholders'
import type {
  ExtractDomains,
  ExtractHandlesByDomainAndLanguage,
  ExtractInput,
  ExtractLanguagesByDomain,
  TranslatableStrings,
  TranslatableStringsDefinition,
} from './types'

/**
 * Internationalization (i18n) service for translating strings in multiple languages.
 */
export class I18n<T = never[]> {
  protected definitions: TranslatableStringsDefinition[] = []
  protected fallbackLanguages: string[] = []
  protected cache: Record<string, Record<string, string>> = {}

  /**
   * Creates a copy of the current `I18n` instance.
   * The `deep` parameter (default: `false`) controls whether to perform a deep clone of internal data structures.
   */
  clone(deep = false) {
    const i18n = new I18n<T>()
    i18n.definitions = deep ? deepClone(this.definitions) : [...this.definitions]
    i18n.fallbackLanguages = [...this.fallbackLanguages]
    i18n.cache = deep ? deepClone(this.cache) : { ...this.cache }
    return i18n as I18n<T>
  }

  /**
   * Checks if a translatable string definition exists for a specific `domain` and `language`.
   */
  hasDefinition(domain: string, language: string) {
    return !!this.getDefinition(domain, language)
  }

  /**
   * Retrieves a translatable string definition for a specific `domain` and `language`.
   * Returns `undefined` if no definition is found.
   */
  getDefinition(domain: string, language: string): TranslatableStringsDefinition | undefined {
    return this.definitions.find((def) => def.domain === domain && def.language === language)
  }

  /**
   * Defines translatable strings for internationalization (i18n) purposes.
   *
   * This method allows you to define a set of translatable strings for a specific `domain` and `language`.
   * It supports plain text translations as well as complex patterns with placeholders and conditional replacements.
   *
   * When using the `default` domain, you can use `_` as a shorthand for `__` in translation calls.
   *
   * @example
   * ```ts
   * const i18n = new I18n()
   *
   * i18n.defineTranslatableStrings({
   *   domain: 'default',
   *   language: 'de',
   *   strings: {
   *     // Plain text
   *     'Welcome': 'Willkommen',
   *
   *     // Pattern with placeholders
   *     'Displayed: $count entries': createPattern(
   *       // Translated text pattern
   *       'Angezeigt: $count $entries',
   *       // Required user inputs
   *       {
   *         // Handle $count as a number
   *         count: 'number',
   *       },
   *       // Conditional replacements
   *       {
   *         // Resolve $entries based on the value of $count
   *         entries: [
   *           // All conditions must be met for this output
   *           { conditions: [{ count: 1 }], output: 'Eintrag' },
   *           // Always matches
   *           'Einträge',
   *         ],
   *       },
   *     ),
   *   },
   * })
   *
   * // Usage example:
   * i18n.__('default', 'de', 'Welcome')                     // 'Willkommen'
   * i18n._('de', 'Welcome')                                 // 'Willkommen'
   * i18n._('de', 'Displayed: $count entries', { count: 1 }) // 'Angezeigt: 1 Eintrag'
   * i18n._('de', 'Displayed: $count entries', { count: 2 }) // 'Angezeigt: 2 Einträge'
   * ```
   */
  defineTranslatableStrings<
    TDomain extends string,
    TLanguage extends string,
    TTranslatableStrings extends TranslatableStrings,
  >(definition: TranslatableStringsDefinition<TDomain, TLanguage, TTranslatableStrings>) {
    this.definitions.push(definition)

    if (this.cache[`${definition.domain}:${definition.language}`]) {
      delete this.cache[`${definition.domain}:${definition.language}`]
    }

    return this as I18n<
      ((T & unknown[])[number] | TranslatableStringsDefinition<TDomain, TLanguage, TTranslatableStrings>)[]
    >
  }

  /**
   * Sets a single fallback language for when a translation is unavailable in the selected language.
   * If no translation is found in the selected or fallback language, the original handle is returned.
   *
   * @example
   * ```ts
   * const i18n = new I18n()
   *
   * i18n.defineTranslatableStrings({
   *   domain: 'default',
   *   language: 'en',
   *   strings: {
   *     'greeting': 'Hello',
   *   },
   * })
   *
   * i18n._('en', 'greeting') // 'Hello'
   * i18n._('de', 'greeting') // 'greeting' (falls back to the handle itself)
   *
   * i18n.setFallbackLanguage('en')
   * i18n._('de', 'greeting') // 'Hello' (uses the fallback language)
   * ```
   */
  setFallbackLanguage(language: string) {
    this.fallbackLanguages = [language]
    this.cache = {}
    return this
  }

  /**
   * Sets fallback languages for when a translation is unavailable in the selected language.
   * Fallback languages are checked in the order they are specified.
   * If no translation is found in the selected or fallback languages, the original handle is returned.
   *
   * @example
   * ```ts
   * const i18n = new I18n()
   *
   * i18n.defineTranslatableStrings({
   *   domain: 'default',
   *   language: 'en',
   *   strings: {
   *     'greeting': 'Hello',
   *   },
   * })
   *
   * i18n.defineTranslatableStrings({
   *   domain: 'default',
   *   language: 'de',
   *   strings: {
   *     'greeting': 'Hallo',
   *   },
   * })
   *
   * i18n._('en', 'greeting') // 'Hello'
   * i18n._('de', 'greeting') // 'Hallo'
   * i18n._('fr', 'greeting') // 'greeting' (falls back to the handle itself)
   *
   * i18n.setFallbackLanguages(['en', 'de'])
   * i18n._('fr', 'greeting') // 'Hello' (uses the first available fallback language)
   * ```
   */
  setFallbackLanguages(languages: string[]) {
    this.fallbackLanguages = languages
    this.cache = {}
    return this
  }

  /**
   * Retrieves a translated string for a given `domain`, `language`, and `handle`, with optional `input` parameters.
   *
   * @example
   * ```ts
   * const i18n = new I18n()
   *
   * i18n.defineTranslatableStrings({
   *   domain: 'default',
   *   language: 'de',
   *   strings: {
   *     'Welcome': 'Willkommen',
   *     'Logged in as $name': createPattern(
   *       'Angemeldet als $name',
   *       { name: 'string' },
   *     ),
   *   },
   * })
   *
   * i18n.defineTranslatableStrings({
   *   domain: 'errors',
   *   language: 'de',
   *   strings: {
   *     'Not found': 'Nicht gefunden',
   *   },
   * })
   *
   * i18n.defineTranslatableStrings({
   *   domain: 'ui',
   *   language: 'de',
   *   strings: {
   *     'Show $count items': createPattern(
   *       '$count Artikel anzeigen',
   *       { count: 'number' },
   *       {
   *         count: [
   *           { conditions: [{ count: 1 }], output: 'Einen' },
   *           '$count',
   *         ],
   *       },
   *     ),
   *   },
   * })
   *
   * i18n.__('default', 'de', 'Welcome')
   * // 'Willkommen'
   *
   * i18n.__('default', 'de', 'Logged in as $name', { name: 'Alice' })
   * // 'Angemeldet als Alice'
   *
   * i18n.__('errors', 'de', 'Not found')
   * // 'Nicht gefunden'
   *
   * i18n.__('ui', 'de', 'Show $count items', { count: 1 })
   * // 'Einen Artikel anzeigen'
   *
   * i18n.__('ui', 'de', 'Show $count items', { count: 5 })
   * // '5 Artikel anzeigen'
   *
   * i18n.__('default', 'de', 'Untranslated handle')
   * // 'Untranslated handle' (falls back to the handle itself)
   * ```
   */
  __<
    TDomain extends ExtractDomains<T>,
    TLanguage extends ExtractLanguagesByDomain<TDomain, T>,
    THandle extends ExtractHandlesByDomainAndLanguage<TDomain, TLanguage, T>,
    TInput extends ExtractInput<TDomain, TLanguage, THandle & string, T>,
  >(domain: TDomain, language: TLanguage, handle: THandle, input?: TInput): string
  __(domain: string, language: string, handle: string, input?: Record<string, boolean | number | string>): string {
    const cacheKey = `${domain}:${language}`
    const handleKey = handle + (input ? `::${JSON.stringify(input)}` : '')

    if (!this.cache[cacheKey]) {
      this.cache[cacheKey] = {}
    }

    if (isUndefined(this.cache[cacheKey][handleKey])) {
      for (const lang of [language, ...this.fallbackLanguages.filter((lang) => lang !== language)]) {
        const definition = this.getDefinition(domain, lang)

        if (definition) {
          this.cache[cacheKey][handleKey] = replacePlaceholders(handle, definition.strings, input)
          break
        }
      }

      if (isUndefined(this.cache[cacheKey][handleKey])) {
        this.cache[cacheKey][handleKey] = handle
      }
    }

    return this.cache[cacheKey][handleKey]
  }

  /**
   * A simplified version of the `__` method without strict type checking for arguments.
   */
  __$(domain: string, language: string, handle: string, input?: Record<string, boolean | number | string>): string {
    return this.__(domain as any, language as any, handle as any, input as any)
  }

  /**
   * A shorthand method for retrieving translated strings from the `default` domain.
   *
   * This method is equivalent to calling `__` with `default` as the domain.
   * It's designed for convenience when working primarily with the `default` translation domain.
   *
   * @example
   * ```ts
   * const i18n = new I18n()
   *
   * i18n.defineTranslatableStrings({
   *   domain: 'default',
   *   language: 'de',
   *   strings: {
   *     'Hello': 'Hallo',
   *     'Good $timeOfDay': createPattern(
   *       'Guten $timeOfDay',
   *       { timeOfDay: 'string' },
   *     ),
   *     'Items: $count': createPattern(
   *       'Artikel: $count',
   *       { count: 'number' },
   *       {
   *         count: [
   *           { conditions: [{ count: 0 }], output: 'Keine' },
   *           { conditions: [{ count: 1 }], output: 'Ein' },
   *           '$count',
   *         ],
   *       },
   *     ),
   *   },
   * })
   *
   * i18n._('de', 'Hello')
   * // 'Hallo'
   *
   * i18n._('de', 'Good $timeOfDay', { timeOfDay: 'Morgen' })
   * // 'Guten Morgen'
   *
   * i18n._('de', 'Items: $count', { count: 0 })
   * // 'Artikel: Keine'
   *
   * i18n._('de', 'Items: $count', { count: 1 })
   * // 'Artikel: Ein'
   *
   * i18n._('de', 'Items: $count', { count: 5 })
   * // 'Artikel: 5'
   *
   * i18n._('de', 'Untranslated')
   * // 'Untranslated' (falls back to the handle itself)
   * ```
   */
  _<
    TLanguage extends ExtractLanguagesByDomain<'default', T>,
    THandle extends ExtractHandlesByDomainAndLanguage<'default', TLanguage, T>,
    TInput extends ExtractInput<'default', TLanguage, THandle & string, T>,
  >(language: TLanguage, handle: THandle, input?: TInput): string
  _(language: string, handle: string, input?: Record<string, boolean | number | string>): string {
    return this.__('default' as any, language as any, handle as any, input as any)
  }

  /**
   * A simplified version of the `_` method without strict type checking for arguments.
   */
  _$(language: string, handle: string, input?: Record<string, boolean | number | string>): string {
    return this._(language, handle as any, input as any)
  }
}
