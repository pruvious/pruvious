import type { TranslatableStringCallbackContext } from '../translations/utils.server'

export interface BlockGroupDefinition {
  /**
   * The unique identifier for the block group in kebab-case.
   *
   * @example
   * ```ts
   * 'heroes'
   * 'special-offers'
   * ```
   */
  name: string

  /**
   * Sets the visible label text for the block group in the dashboard.
   *
   * If not specified, the block group `name` will be automatically transformed to Title case and used as the label.
   * The resulting label is wrapped in the translation function `__('pruvious-dashboard', label)`.
   * This transformation happens in the Vue component.
   *
   * You can either provide a string or a function that returns a string.
   * The function receives an object with `_` and `__` properties to access the translation functions.
   *
   * Important: When using a function, only use simple anonymous functions without context binding,
   * since the option needs to be serialized for client-side use.
   *
   * @example
   * ```ts
   * // String (non-translatable)
   * label: 'Social media'
   *
   * // Function (translatable)
   * label: ({ __ }) => __('pruvious-dashboard', 'Social media')
   *
   * // Block group name transformation (default)
   * // Example: the block group name `special-offers` is transformed into `__('pruvious-dashboard', 'Special offers')`
   * label: undefined
   * ```
   */
  label?: string | ((context: TranslatableStringCallbackContext) => string) | undefined
}

export interface BlockTagDefinition {
  /**
   * The unique identifier for the block tag in kebab-case.
   *
   * @example
   * ```ts
   * 'layout'
   * 'light-blue'
   * ```
   */
  name: string

  /**
   * Sets the visible label text for the block tag in the dashboard.
   *
   * If not specified, the block tag `name` will be automatically transformed to Title case and used as the label.
   * The resulting label is wrapped in the translation function `__('pruvious-dashboard', label)`.
   * This transformation happens in the Vue component.
   *
   * You can either provide a string or a function that returns a string.
   * The function receives an object with `_` and `__` properties to access the translation functions.
   *
   * Important: When using a function, only use simple anonymous functions without context binding,
   * since the option needs to be serialized for client-side use.
   *
   * @example
   * ```ts
   * // String (non-translatable)
   * label: 'Large'
   *
   * // Function (translatable)
   * label: ({ __ }) => __('pruvious-dashboard', 'Large')
   *
   * // Block tag name transformation (default)
   * // Example: the block tag name `light-blue` is transformed into `__('pruvious-dashboard', 'Light blue')`
   * label: undefined
   * ```
   */
  label?: string | ((context: TranslatableStringCallbackContext) => string) | undefined
}
