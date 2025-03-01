import type { TranslatableStrings } from '@pruvious/i18n'

export interface DefineTranslationOptions {}

/**
 * Defines translatable strings for internationalization purposes.
 *
 * Use this as the default export in a file within the `server/translations/` directory.
 * The filename pattern must be `{domain}.{language}` and in kebab-case format (e.g., `shop.en.ts`, `my-account.de.ts`, etc.).
 * For the `default` domain translations, you can skip the domain in the filename (e.g., `en.ts`, `de.ts`, etc.).
 *
 * @see https://pruvious.com/docs/translations
 *
 * @example
 * ```ts
 * // server/translations/de.ts
 * import { createPattern, defineTranslation } from '#pruvious/server'
 *
 * export default defineTranslation({
 *   // Plain text
 *   'Welcome': 'Willkommen',
 *
 *   // Pattern with placeholders
 *   'Displayed: $count entries': createPattern(
 *     // Translated text pattern
 *     'Angezeigt: $count $entries',
 *     // Required user inputs
 *     {
 *       // Handle $count as a number
 *       count: 'number',
 *     },
 *     // Conditional replacements
 *     {
 *       // Resolve $entries based on the value of $count
 *       entries: [
 *         // All conditions must be met for this output
 *         { conditions: [{ count: 1 }], output: 'Eintrag' },
 *         // Always matches
 *         'Einträge',
 *       ],
 *     },
 *   ),
 * })
 *
 * // Usage example:
 * __('default', 'Welcome')                     // 'Willkommen'
 * _('Welcome')                                 // 'Willkommen'
 * _('Displayed: $count entries', { count: 1 }) // 'Angezeigt: 1 Eintrag'
 * _('Displayed: $count entries', { count: 2 }) // 'Angezeigt: 2 Einträge'
 * ```
 */
export function defineTranslation<const T extends TranslatableStrings>(strings: T): T {
  return strings
}
