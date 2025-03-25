import type { TranslatableStringCallbackContext } from '#pruvious/server'
import type { icons } from '@iconify-json/tabler/icons.json'
import type { GenericField } from '@pruvious/orm'

export interface Block<TFields extends Record<string, GenericField>> {
  /**
   * A key-value object of `Field` instances representing the structure of the block.
   *
   * - Object keys represent the field names.
   * - Object values are instances of the `Field` class.
   */
  fields: TFields

  /**
   * Controls how the block is displayed in the dashboard user interface.
   */
  ui?: {
    /**
     * Sets the visible label text for the block in the dashboard.
     *
     * If not specified, the block name will be automatically transformed to Title case and used as the label.
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
     * label: 'Theme options'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Theme options')
     *
     * // Block name transformation (default)
     * // Example: the block name `TwoColumns` is transformed into `__('pruvious-dashboard', 'Two columns')`
     * label: undefined
     * ```
     */
    label: string | ((context: TranslatableStringCallbackContext) => string) | undefined

    /**
     * The icon associated with the block.
     * Must be a valid Tabler icon name.
     *
     * @see https://tabler-icons.io for available icons
     *
     * @default 'components'
     */
    icon: keyof typeof icons
  }
}

export type GenericBlock = Block<Record<string, GenericField>>

export type DefineBlockOptions<TFields extends Record<string, GenericField>> = Partial<Block<TFields>>

/**
 * Defines a new Pruvious block.
 * This function is used internally by Pruvious to define blocks on the server-side.
 * You should not use this function directly in your code.
 * Use the `defineBlock` function in the `#pruvious/client` module instead or simply create a new Vue component in the `app/blocks/` directory.
 *
 * @see https://pruvious.com/docs/blocks
 */
export function defineBlock<const TFields extends Record<string, GenericField>>(
  options: DefineBlockOptions<TFields>,
): Block<TFields> {
  return {
    fields: options.fields ?? ({} as TFields),
    ...options,
  }
}
