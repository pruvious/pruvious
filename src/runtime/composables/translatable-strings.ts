import { useState, type Ref } from '#imports'
import type {
  PublicTranslatableStringsDomain,
  SupportedLanguage,
  TranslatableStringsDomain,
  TranslatableStringsInput,
  TranslatableStringsTextKey,
} from '#pruvious'
import type { TranslatableStringsDefinition } from '../translatable-strings/translatable-strings.definition'
import { toArray } from '../utils/array'
import { pruviousFetch } from '../utils/fetch'
import { isKeyOf } from '../utils/object'
import { replacePlaceholders } from '../utils/translatable-strings'
import { getLanguage, useLanguage } from './language'

/**
 * Cached translatable strings.
 */
export const useTranslatableStrings: () => Ref<
  Partial<
    Record<
      TranslatableStringsDomain,
      Record<string, { strings: TranslatableStringsDefinition['strings'] | 'pending'; cache: Record<string, string> }>
    >
  >
> = () => useState('pruvious-translatable-strings', () => ({}))

/**
 * Fetch and display translated `text` from the specified `domain` in the current language.
 * This function is designed for **Vue** applications.
 * For server-side use, import the same-named function from `#pruvious/server`.
 *
 * The current language is stored in the browser's local storage.
 * If the translation is not found in the current language, a fallback in the primary language is provided.
 *
 * @see https://pruvious.com/docs/translatable-strings
 *
 * @example
 * ```typescript
 * __('blog', 'Displayed: $count $entries', { count: 1 }) // 'Displayed: 1 post
 * __('blog', 'Displayed: $count $entries', { count: 2 }) // 'Displayed: 2 posts
 * ```
 */
export function __<D extends PublicTranslatableStringsDomain, K extends TranslatableStringsTextKey[D]>(
  domain: D,
  text: K,
): string

export function __<D extends PublicTranslatableStringsDomain, K extends keyof TranslatableStringsInput[D]>(
  domain: D,
  text: K,
  input: TranslatableStringsInput[D][K & keyof TranslatableStringsInput[D]],
): string

export function __<D extends PublicTranslatableStringsDomain>(
  domain: D,
  text: string,
  input?: Record<string, 'boolean' | 'number' | 'string'>,
): string {
  const ts = useTranslatableStrings()
  const language = useLanguage().value ?? ''
  const cacheKey = text + (input ? `|${JSON.stringify(input)}` : '')

  if (
    ts.value[domain]?.[language]?.strings &&
    ts.value[domain]?.[language].strings !== 'pending' &&
    !isKeyOf(ts.value[domain]![language].cache, cacheKey)
  ) {
    ts.value[domain]![language].cache[cacheKey] = replacePlaceholders(
      text,
      ts.value[domain]?.[language].strings as any,
      input,
    )
  }

  return ts.value[domain]?.[language]?.cache[cacheKey] || text
}

/**
 * Fetch and display translated `text` from the `default` domain in the current language.
 * This function is designed for **Vue** applications.
 * For server-side use, import the same-named function from `#pruvious/server`.
 *
 * The current language is stored in the browser's local storage.
 * If the translation is not found in the current language, a fallback in the primary language is provided.
 *
 * @see https://pruvious.com/docs/translatable-strings
 *
 * @example
 * ```typescript
 * _('Welcome, $name', { name: 'Padawan' })
 *
 * // Same as:
 * __('default', 'Welcome, $name', { name: 'Padawan' })
 * ```
 */
export function _<K extends TranslatableStringsTextKey['default']>(text: K): string

export function _<K extends keyof TranslatableStringsInput['default']>(
  text: K,
  input: TranslatableStringsInput['default'][K & keyof TranslatableStringsInput['default']],
): string

export function _(text: string, input?: Record<string, 'boolean' | 'number' | 'string'>): string {
  return (__ as any)('default', text, input)
}

/**
 * Loads translatable strings for a specified `domain` (defaults to `default`).
 * If `language` is not provided, it is automatically detected.
 *
 * @see https://previous.com/docs/translatable-strings
 */
export async function loadTranslatableStrings(
  domain?: PublicTranslatableStringsDomain | PublicTranslatableStringsDomain[],
  language?: SupportedLanguage,
) {
  const ts = useTranslatableStrings()
  const promises: Promise<any>[] = []

  domain ||= 'default' as any
  language ||= getLanguage()

  for (const d of toArray(domain)) {
    if (!ts.value[d]?.[language]) {
      ts.value[d] ||= {}
      ts.value[d]![language] = { strings: 'pending', cache: {} }

      promises.push(
        pruviousFetch('translatable-strings.get', { subpath: d, query: { language } }).then((response) => {
          ts.value[d]![language!].strings = response.success ? response.data : {}
        }),
      )
    }
  }

  await Promise.all(promises)
}
