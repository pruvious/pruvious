import { defineField, type TranslatableStringCallbackContext } from '#pruvious/server'
import { booleanFieldModel } from '@pruvious/orm'

const customOptions: {
  ui?: {
    /**
     * Defines the visual style variant of the switch.
     *
     * @default 'accent'
     */
    variant?: 'primary' | 'accent'

    /**
     * The label shown after the switch control.
     *
     * If not specified, the field name will be automatically transformed to Title case and used as the label.
     * The resulting label is wrapped in the translation function `__('pruvious-dashboard', label)`.
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
     * label: 'Show button'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Show button')
     *
     * // Field name transformation (default)
     * // Example: the field name `showButton` is transformed into `__('pruvious-dashboard', 'Show button')`
     * label: undefined
     * ```
     */
    label?: string | ((context: TranslatableStringCallbackContext) => string) | undefined

    /**
     * The label for the field.
     *
     * You can either provide a string or a function that returns a string.
     * The function receives an object with `_` and `__` properties to access the translation functions.
     *
     * Important: When using a function, only use simple anonymous functions without context binding,
     * since the option needs to be serialized for client-side use.
     *
     * @default undefined
     *
     * @example
     * ```ts
     * // String (non-translatable)
     * label: 'Load more button'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Load more button')
     *
     * // Field name transformation (default)
     * // Example: the field name `loadMoreButton` is transformed into `__('pruvious-dashboard', 'Load more button')`
     * label: undefined
     * ```
     */
    fieldLabel?: string | ((context: TranslatableStringCallbackContext) => string) | undefined
  }
} = {
  ui: {
    variant: 'accent',
  },
}

export default defineField({
  model: booleanFieldModel(),
  customOptions,
})
