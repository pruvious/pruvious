import type { AuthUser } from '#pruvious'
import type { ConditionalRule } from '../fields/field.definition'

export interface TranslatableStringsDefinition {
  /**
   * Represents the domain name for translatable strings.
   * API queries use the `domain` and `language` parameters to fetch the corresponding strings.
   *
   * The `'default'` domain name simplifies displaying strings by allowing the use of `_(text)` calls instead of `__('default', text)` functions.
   * Moreover, strings from the `'default'` are automatically preloaded in Vue components.
   *
   * @example
   * ```typescript
   * // Domain: 'forum'
   * defineTranslatableStrings({ domain: 'forum', language: 'en', strings: { foo: 'bar' }})
   * __('forum', 'foo') // Output: 'bar'
   *
   * // Domain: 'default'
   * defineTranslatableStrings({ domain: 'default', language: 'en', strings: { foo: 'baz' }})
   * _('foo') // Output: 'baz'
   * __('default', 'foo') // Output: 'baz'
   * ```
   */
  domain: string

  /**
   * Represents the language code for translatable strings.
   * This code should align with a code specified in the `language.supported` module option (e.g., 'en', 'de', 'fr', etc.).
   */
  language: string

  /**
   * Contains key-value pairs of translatable strings.
   * The keys represent text handles, and the values are either translated text or patterns.
   *
   * @example
   * ```typescript
   * defineTranslatableStrings({
   *   domain: 'default',
   *   language: 'en',
   *   strings:{
   *     'Welcome': 'Welcome',               // Simply displays the text 'Welcome'
   *     'Displayed: $count $entries': {
   *       pattern: 'Displayed: $count $entries',
   *       input: {
   *         count: 'number',                // Replaces $count in the pattern
   *       },                                // _('Displayed: $count $entries', { count })
   *       replacements: {
   *         entries: [                      // The resolved output replaces $entries in the pattern
   *           {
   *             conditions: [{ count: 1 }], // If all conditions are met...
   *             output: 'post',             // output 'post'
   *           },
   *           'posts',                      // Otherwise, output 'posts'
   *         ],
   *       },
   *     },
   *   },
   * })
   * ```
   */
  strings: Record<string, string | TranslatableStringPattern>

  /**
   * Determines whether the translatable strings can be publicly accessed through the API and used on the client side.
   *
   * You can customize the API route in the `api.routes` module option.
   *
   * @default true
   */
  api?: boolean

  /**
   * Custom guards executed when reading translatable strings via the API route `/api/translatable-strings/[domain]/?language=[language]`.
   * Guards are executed in sequence according to their array order, with the exception that they are not applied to admin users.
   *
   * @default []
   *
   * @example
   * ```typescript
   * [
   *   ({ _, language, user }) => {
   *     if (!hasCapability(user, 'custom-capability')) {
   *       throw new Error(_(language, 'Access denied'))
   *     }
   *   },
   * ]
   * ```
   */
  guards?: ((context: TranslatableStringsGuardContext) => any | Promise<any>)[]
}

export interface TranslatableStringPattern {
  /**
   * Text pattern allowing replacement of parts starting with a dollar sign (`$`).
   * Alphanumeric characters following the dollar sign are called "placeholders" (e.g., `$count` => `count`).
   * All placeholders in the `pattern` must exist in `replacements` or `inputs`.
   *
   * To use a dollar sign literally, escape it with another dollar sign (e.g., `$$notPlaceholder`).
   *
   * @example
   * ```typescript
   * 'Displayed: $count $entries'
   * ```
   */
  pattern: string

  /**
   * Input parameters for generating `replacements`.
   * Values are converted to specified types (boolean, number, or string).
   * If a replacement isn't defined in the `replacements` parameter, the corresponding output will be sourced from this context.
   *
   * @example
   * ```typescript
   * { 'count': 'number' }
   * ```
   */
  input?: Record<string, 'boolean' | 'number' | 'string'>

  /**
   * A key-value object containing strings that replace placeholders in the `pattern`.
   * The keys represent placeholders (without the dollar sign).
   * The values can be literal strings corresponding to `input` keys, or logic resolving to strings.
   *
   * The ultimate replacement will be determined by either the first logic-based replacement that
   * fulfills all conditions or a literal string replacement.
   *
   * @example
   * ```typescript
   * {
   *   'entries': [
   *     { conditions: [{ count: 1 }], output: 'post' },
   *     'posts',
   *   ],
   * }
   * ```
   */
  replacements?: Record<string, string | (string | TranslatableStringReplacementLogic)[]>
}

export interface TranslatableStringReplacementLogic {
  /**
   * An array of conditions that must all be met to determine the replacement.
   * Conditions are key-value objects where the key refers to an `input` key.
   * The value can be a literal boolean, number, or string that's compared using `===`.
   * Alternatively, it can be an object defining other comparison operators.
   *
   * @example
   * ```typescript
   * [
   *   { count: 1 },                       // count === 1
   *   { count: { 'eq': 1 } },             // count === 1
   *   { count: { 'ne': 1 } },             // count !== 1
   *   { count: { 'gt': 1 } },             // count > 1
   *   { count: { 'gte': 1 } },            // count >= 1
   *   { count: { 'lt': 1 } },             // count > 1
   *   { count: { 'lte': 1 } },            // count >= 1
   *   { count: { 'regexp': '^[0-9]$' } }, // /^[0-9]$/.test(1)
   * ]
   * ```
   */
  conditions: Record<string, boolean | number | string | ConditionalRule>[]

  /**
   * The resulting replacement string when all `conditions` are satisfied.
   */
  output: string
}

export interface TranslatableStringsGuardContext {
  /**
   * The current logged-in user associated with the request or `null` if no user is authenticated.
   */
  user: AuthUser | null

  /**
   * The resolved translatable strings definition object.
   */
  definition: Required<TranslatableStringsDefinition>
}

/**
 * Define translatable strings for a given `domain` and `language`.
 *
 * The `'default'` domain name simplifies displaying strings by allowing the use of `_('some text')` calls instead of `__('default', 'some text')`.
 *
 * @example
 * ```typescript
 * defineTranslatableStrings({
 *   domain: 'blog',
 *   language: 'de',
 *   strings: {
 *     'Welcome': 'Wilkommen',             // Simply displays the text 'Wilkommen'
 *     'Displayed: $count $entries': {
 *       pattern: 'Angezeigt: $count $entries',
 *       input: {
 *         count: 'number',                // Replaces $count in the pattern
 *       },
 *       replacements: {
 *         entries: [                      // The resolved output replaces $entries in the pattern
 *           {
 *             conditions: [{ count: 1 }], // If all conditions are met...
 *             output: 'Beitrag',          // output 'Beitrag'
 *           },
 *           'Beiträge',                   // Otherwise, output 'Beiträge'
 *         ],
 *       },
 *     },
 *   },
 * })
 *
 * // Examples:
 * __('blog', 'Displayed: $count $entries', { count: 1 }) // 'Angezeigt: 1 Beitrag
 * __('blog', 'Displayed: $count $entries', { count: 2 }) // 'Angezeigt: 2 Beiträge
 * ```
 */
export function defineTranslatableStrings(
  definition: TranslatableStringsDefinition,
): Required<TranslatableStringsDefinition> {
  return {
    domain: definition.domain,
    language: definition.language,
    strings: definition.strings,
    api: definition.api ?? true,
    guards: definition.guards ?? [],
  }
}
