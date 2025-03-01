import type { ExtractPlaceholders, Pattern, Replacement } from './types'

/**
 * Creates a new translatable string pattern.
 *
 * @example
 * ```ts
 * const i18n = new I18n()
 *
 * i18n.defineTranslatableStrings({
 *   domain: 'default',
 *   language: 'de',
 *   strings: {
 *     'Displayed: $count entries': createPattern(
 *       // Translated text pattern
 *       'Angezeigt: $count $entries',
 *
 *       // Required user inputs
 *       {
 *         count: 'number',
 *       },
 *
 *       // Conditional replacements
 *       {
 *         entries: [
 *           { conditions: [{ count: 1 }], output: 'Eintrag' },
 *           'Einträge',
 *         ],
 *       },
 *     ),
 *   },
 * })
 *
 * // Usage example:
 * i18n._('de', 'Displayed: $count entries', { count: 1 }) // 'Angezeigt: 1 Eintrag'
 * i18n._('de', 'Displayed: $count entries', { count: 2 }) // 'Angezeigt: 2 Einträge'
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
  return { translation, input: input as any, replacements: replacements as any }
}
