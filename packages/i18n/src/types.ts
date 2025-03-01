import type { I18n } from './I18n'

export interface TranslatableStringsDefinition<
  TDomain extends string = string,
  TLanguage extends string = string,
  TTranslatableStrings extends TranslatableStrings = TranslatableStrings,
> {
  /**
   * Unique identifier for this group of translatable strings.
   * A single domain can have multiple languages.
   *
   * @example
   * ```ts
   * 'common'
   * 'errors'
   * 'form-messages'
   * ```
   */
  domain: TDomain

  /**
   * Lowercase language code for the translatable strings.
   * The codes must be unique within a `domain`.
   *
   * @example
   * ```ts
   * 'en'
   * 'de'
   * 'fr'
   * ```
   */
  language: TLanguage

  /**
   * Key-value pairs of translatable strings.
   * Keys are text handles, and the values are translated text or patterns.
   *
   * @example
   * ```ts
   * {
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
   * }
   * ```
   */
  strings: TTranslatableStrings
}

export type TranslatableStrings = Record<string, string | Pattern>

export interface Pattern<
  TTranslation extends string = string,
  TInput extends Record<string, 'boolean' | 'number' | 'string'> = Record<string, 'boolean' | 'number' | 'string'>,
> {
  /**
   * Translated text pattern with replaceable parts starting with `$`.
   * Characters after `$` are placeholders (e.g., `$count` => `count`).
   * All placeholders must exist in either `replacements` or `inputs`.
   *
   * Use `$$` for literal `$` (e.g., `$$notPlaceholder`).
   *
   * @example
   * ```ts
   * 'Angezeigt: $count $entries'
   * ```
   */
  translation: TTranslation

  /**
   * Input definitions for variable placeholders in the `translation` pattern.
   * A placeholder is a key in the `translation` pattern after `$` (e.g., `$count` => `count`).
   *
   * Only define placeholders here if their values are dynamic and need to be passed as arguments.
   * The `replacements` object can use these inputs for condition evaluation.
   *
   * @example
   * ```ts
   * { count: 'number' }
   * ```
   */
  input?: TInput

  /**
   * Replacement logic for placeholders in the `translation` pattern.
   * A placeholder is a key in the `translation` pattern after `$` (e.g., `$count` => `count`).
   *
   * Define as key-value pairs where:
   *
   * - Keys are placeholders (e.g., `count`).
   * - Values are arrays of strings or conditional replacement objects.
   *
   * The replacements are evaluated in order, and the first positive match is used.
   *
   * @example
   * ```ts
   * {
   *   entries: [
   *     { conditions: [{ count: 1 }], output: 'Beitrag' },
   *     'Beiträge',
   *   ],
   * }
   * ```
   */
  replacements?: Record<TTranslation, (string | Replacement<TInput>)[]>
}

export interface Replacement<
  TInput extends Record<string, 'boolean' | 'number' | 'string'> = Record<string, 'boolean' | 'number' | 'string'>,
> {
  /**
   * Conditions for determining the replacement output.
   *
   * Define as key-value objects where keys refer to an `input` key of the same pattern.
   *
   * Values can be:
   *
   * - `boolean`, `number`, or `string` for direct equality comparison.
   * - `ConditionalRule` object for more complex conditions.
   *
   * @example
   * ```ts
   * [
   *   { count: 1 },                     // count === 1
   *   { count: { '=': 1 } },            // count === 1
   *   { count: { '!=': 1 } },           // count !== 1
   *   { count: { '>': 1 } },            // count > 1
   *   { count: { '>=': 1 } },           // count >= 1
   *   { count: { '<': 1 } },            // count < 1
   *   { count: { '<=': 1 } },           // count <= 1
   *   { count: { regexp: '^[0-9]$' } }, // /^[0-9]$/.test(count)
   * ]
   * ```
   */
  conditions: Partial<{
    [K in keyof TInput]:
      | (TInput[K] extends 'boolean'
          ? boolean
          : TInput[K] extends 'number' | 'string'
            ? number | string
            : boolean | number | string)
      | ConditionalRule<TInput[K]>
  }>[]

  /**
   * Resulting replacement string when all `conditions` are satisfied.
   *
   * @example
   * ```ts
   * 'Eintrag'
   * ```
   */
  output: string
}

export type ConditionalRule<T extends 'boolean' | 'number' | 'string'> =
  | { '=': T extends 'boolean' ? boolean : number | string }
  | { '!=': T extends 'boolean' ? boolean : number | string }
  | (T extends 'number'
      ? { '>': number | string } | { '>=': number | string } | { '<': number | string } | { '<=': number | string }
      : never)
  | (T extends 'string' ? { regexp: string | { pattern: string; flags?: string } } : never)

export interface Token {
  type: 'literal' | 'placeholder'
  value: string
}

export type I18nIntersection<TI18n> = TI18n & I18n<unknown[]>

export type ExtractTranslatableStringsDefinitions<TI18n> = TI18n extends I18n<infer U> ? U : never

export type TranslatableStringsDefinitionsIntersection<T> = T & Omit<TranslatableStringsDefinition, 'strings'>[]

export type ExtractDomains<
  T,
  U extends TranslatableStringsDefinitionsIntersection<T> = TranslatableStringsDefinitionsIntersection<T>,
> = U[number]['domain']

export type ExtractLanguagesByDomain<
  TDomain extends string,
  T,
  U extends TranslatableStringsDefinitionsIntersection<T> = TranslatableStringsDefinitionsIntersection<T>,
> = Extract<U[number], { domain: TDomain }>['language']

export type ExtractHandlesByDomainAndLanguage<
  TDomain extends string,
  TLanguage extends string,
  T,
  U extends TranslatableStringsDefinitionsIntersection<T> = TranslatableStringsDefinitionsIntersection<T>,
  V = Extract<U[number], { domain: TDomain; language: TLanguage }>,
> = V extends { strings: TranslatableStrings } ? keyof V['strings'] : never

export type ExtractInput<
  TDomain extends string,
  TLanguage extends string,
  THandle extends string,
  T,
  U extends TranslatableStringsDefinitionsIntersection<T> = TranslatableStringsDefinitionsIntersection<T>,
  V = Extract<U[number], { domain: TDomain; language: TLanguage }>,
  W = Extract<V, { strings: TranslatableStrings }>,
> = W extends { strings: Record<THandle, Pattern> } ? ExtractInputTypes<W['strings'][THandle]['input']> : never

export type ExtractInputTypes<T extends Record<string, 'string' | 'number' | 'boolean'> | undefined> = {
  [K in keyof T]: T[K] extends 'number' | 'string' ? number | string : T[K] extends 'boolean' ? boolean : never
}

type CharacterAfterPlaceholder =
  | ' '
  | '.'
  | ','
  | '!'
  | '?'
  | ':'
  | ';'
  | "'"
  | '"'
  | '('
  | ')'
  | '['
  | ']'
  | '{'
  | '}'
  | '<'
  | '>'
  | '-'
  | '_'
  | '+'
  | '='
  | '*'
  | '&'
  | '^'
  | '%'
  | '$'
  | '#'
  | '@'
  | '!'
  | '~'
  | '`'
  | '|'
  | '\\'
  | '/'
  | '\n'
  | '\r'
  | '\t'

type ExtractPlaceholderRecords<
  T extends string,
  P extends Record<string, any> = {},
> = T extends `${infer _}$${infer Param}${CharacterAfterPlaceholder}${infer R}`
  ? ExtractPlaceholderRecords<
      R,
      P & (Param extends `${infer _}${CharacterAfterPlaceholder}` ? {} : { [K in Param]: any })
    >
  : P & (T extends `${infer _}$${infer LastParam}` ? { [K in LastParam]: any } : {})

/**
 * Extracts placeholders starting with a dollar sign from a string.
 *
 * @example
 * ```ts
 * type T0 = ExtractPlaceholders<'Displayed: $count entries'> // 'count'
 * type T1 = ExtractPlaceholders<'Hi $n, your balance is $b'> // 'n' | 'b'
 * type T2 = ExtractPlaceholders<'No placeholders here'>      // never
 * ```
 */
export type ExtractPlaceholders<T extends string, U = ExtractPlaceholderRecords<T>> = U extends U
  ? Exclude<keyof U, ''>
  : never
