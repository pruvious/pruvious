import { _, __ } from '#pruvious/client/i18n'
import type { TranslatableStringCallbackContext } from '#pruvious/server'
import { isFunction } from '@pruvious/utils'

/**
 * Executes a translatable string callback or returns the provided string.
 *
 * Translatable string callbacks are used for translating field option values, usually in the UI.
 * They are anonymous functions that receive an object with `_` and `__` properties to access the translation functions.
 * The language is automatically resolved from the `useLanguage()` composable.
 *
 * @example
 * ```ts
 * // String
 * maybeTranslate('First Name') // 'First Name'
 *
 * // Function
 * maybeTranslate(({ _ }) => _('First Name')) // 'Vorname'
 * ```
 */
export function maybeTranslate<T extends string | ((context: TranslatableStringCallbackContext) => string) | undefined>(
  value: T,
): T extends undefined ? string | undefined : string {
  return isFunction(value) ? value({ _: _, __: __ }) : (value as any)
}
