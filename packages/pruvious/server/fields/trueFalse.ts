import { defineField, type TranslatableStringCallbackContext } from '#pruvious/server'
import { booleanFieldModel } from '@pruvious/orm'

const customOptions: {
  ui?: {
    /**
     * Defines the label for the switch when the value is `false`.
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
     * label: 'Disabled'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Disabled')
     * ```
     *
     * @default
     * ({ __ }) => __('pruvious-dashboard', 'No')
     */
    noLabel?: string | ((context: TranslatableStringCallbackContext) => string)

    /**
     * Defines the label for the switch when the value is `true`.
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
     * label: 'Enabled'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Enabled')
     * ```
     *
     * @default
     * ({ __ }) => __('pruvious-dashboard', 'Yes')
     */
    yesLabel?: string | ((context: TranslatableStringCallbackContext) => string)

    /**
     * Defines the visual style variant of the switch.
     *
     * @default 'primary'
     */
    variant?: 'primary' | 'accent'
  }
} = {
  ui: {
    noLabel: ({ __ }) => __('pruvious-dashboard', 'No'),
    yesLabel: ({ __ }) => __('pruvious-dashboard', 'Yes'),
    variant: 'primary',
  },
}

export default defineField({
  model: booleanFieldModel(),
  customOptions,
})
