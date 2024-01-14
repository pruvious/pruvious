import type {
  SupportedLanguage,
  TranslatableStringsDomain,
  TranslatableStringsInput,
  TranslatableStringsTextKey,
} from '#pruvious'
import { translatableStrings } from '#pruvious/server'
import { H3Event } from 'h3'
import { getModuleOption } from '../../instances/state'
import type { TranslatableStringsDefinition } from '../../translatable-strings/translatable-strings.definition'
import { isString } from '../../utils/string'
import { replacePlaceholders } from '../../utils/translatable-strings'

/**
 * Fetch and display translated `text` from the specified `domain` in the given language.
 * This function is intended for **server-side** use.
 * For Vue usage, import the same-named function from `#pruvious/client`.
 * The function becomes available automatically in your app if auto imports are enabled.
 *
 * Alternatively, you can provide a `H3Event` instead of a language code.
 * The current language will be determined from the `Accept-Language` header.
 *
 * If the translation is not found in the given language, a fallback in the primary language is provided.
 *
 * @see https://pruvious.com/docs/translatable-strings
 *
 * @example
 * ```typescript
 * __('en', 'blog', 'Displayed: $count $entries', { count: 1 }) // 'Displayed: 1 post
 * __('en', 'blog', 'Displayed: $count $entries', { count: 2 }) // 'Displayed: 2 posts
 * ```
 */
export function __<D extends TranslatableStringsDomain, K extends TranslatableStringsTextKey[D]>(
  eventOrLanguage: H3Event | SupportedLanguage,
  domain: D,
  text: K,
): string

export function __<D extends TranslatableStringsDomain, K extends keyof TranslatableStringsInput[D]>(
  eventOrLanguage: H3Event | SupportedLanguage,
  domain: D,
  text: K,
  input: TranslatableStringsInput[D][K & keyof TranslatableStringsInput[D]],
): string

export function __<D extends TranslatableStringsDomain>(
  eventOrLanguage: H3Event | SupportedLanguage,
  domain: D,
  text: string,
  input?: Record<string, boolean | number | string>,
): string {
  const options = getModuleOption('language')
  const primaryLanguage = options.primary
  const language = isString(eventOrLanguage) ? eventOrLanguage : eventOrLanguage.context.language
  const ts: Record<string, Required<TranslatableStringsDefinition>> | undefined = (translatableStrings as any)[domain]

  if (ts?.[language] && ts![language].strings[text]) {
    return replacePlaceholders(text, ts[language].strings, input)
  } else if (ts?.[primaryLanguage] && ts![primaryLanguage].strings[text]) {
    return replacePlaceholders(text, ts[primaryLanguage].strings, input)
  }

  return text
}

/**
 * Fetch and display translated `text` from the `default` domain in the given language.
 * This function is intended for **server-side** use.
 * For Vue usage, import the same-named function from `#pruvious/client`.
 * The function becomes available automatically in your app if auto imports are enabled.
 *
 * Alternatively, you can provide a `H3Event` instead of a language code.
 * The current language will be determined from the `Accept-Language` header.
 *
 * If the translation is not found in the given language, a fallback in the primary language is provided.
 *
 * @see https://pruvious.com/docs/translatable-strings
 *
 * @example
 * ```typescript
 * _('en', 'Hello, $subject', { subject: 'World' })
 *
 * // Same as:
 * __('en', 'default', 'Hello, $subject', { subject: 'World' })
 * ```
 */
export function _<K extends TranslatableStringsTextKey['default']>(
  eventOrLanguage: H3Event | SupportedLanguage,
  text: K,
): string

export function _<K extends keyof TranslatableStringsInput['default']>(
  eventOrLanguage: H3Event | SupportedLanguage,
  text: K,
  input: TranslatableStringsInput['default'][K & keyof TranslatableStringsInput['default']],
): string

export function _(
  eventOrLanguage: H3Event | SupportedLanguage,
  text: string,
  input?: Record<string, 'boolean' | 'number' | 'string'>,
): string {
  return (__ as any)(eventOrLanguage, 'default', text, input)
}
