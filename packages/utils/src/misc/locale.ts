/**
 * Strict [BCP-47](https://www.rfc-editor.org/info/bcp47) subset accepted by the Pruvious CMS:
 *
 * - lowercase 2 or 3 letter language base (e.g. `en`, `de`, `fil`)
 * - optional Title-case script subtag (e.g. `zh-Hant`, `sr-Latn`)
 * - optional UPPERCASE region or 3-digit M.49 region (e.g. `de-AT`, `es-419`)
 *
 * @example
 * ```ts
 * isBCP47LanguageCode('en')         // true
 * isBCP47LanguageCode('de-AT')      // true
 * isBCP47LanguageCode('zh-Hant')    // true
 * isBCP47LanguageCode('sr-Latn-RS') // true
 * isBCP47LanguageCode('es-419')     // true
 * isBCP47LanguageCode('EN')         // false (base must be lowercase)
 * isBCP47LanguageCode('de_AT')      // false (separator must be hyphen)
 * isBCP47LanguageCode('de-at')      // false (region must be uppercase)
 * ```
 */
export function isBCP47LanguageCode(code: string): boolean {
  return /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?$/.test(code)
}

/**
 * Converts a BCP-47 language `code` to the Open Graph `og:locale` form used by Facebook and other
 * scrapers, which expect an underscore between language and region (e.g. `en_US`, not `en-US`).
 * Bare codes are returned unchanged.
 *
 * @example
 * ```ts
 * toOgLocale('en')    // 'en'
 * toOgLocale('de-AT') // 'de_AT'
 * toOgLocale('pt-BR') // 'pt_BR'
 * ```
 */
export function toOgLocale(code: string): string {
  return code.replace(/-/g, '_')
}

/**
 * Formats a BCP-47 language `code` for compact display in dashboard pills, badges, and toasts.
 * Base codes are uppercased. Regional or script-tagged codes render the base, then the subtags
 * uppercased inside parentheses.
 *
 * @example
 * ```ts
 * formatLanguageCode('en')         // 'EN'
 * formatLanguageCode('de')         // 'DE'
 * formatLanguageCode('de-AT')      // 'DE (AT)'
 * formatLanguageCode('pt-BR')      // 'PT (BR)'
 * formatLanguageCode('zh-Hant')    // 'ZH (HANT)'
 * formatLanguageCode('sr-Latn-RS') // 'SR (LATN-RS)'
 * formatLanguageCode('es-419')     // 'ES (419)'
 * ```
 */
export function formatLanguageCode(code: string): string {
  const [base, ...rest] = code.split('-')
  if (rest.length === 0) {
    return base!.toUpperCase()
  }
  return `${base!.toUpperCase()} (${rest.join('-').toUpperCase()})`
}
