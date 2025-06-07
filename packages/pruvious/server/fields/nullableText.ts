import { defineField, type TranslatableStringCallbackContext } from '#pruvious/server'
import { textFieldModel } from '@pruvious/orm'

const customOptions: {
  ui?: {
    /**
     * @default
     * {
     *   hyphenate: false,
     *   truncate: { lines: 1 },
     * }
     */
    dataTable?: {
      /**
       * Controls whether long words should be hyphenated to fit in the cell.
       * When `true`, long words will be broken with hyphens to prevent overflow.
       *
       * @default false
       */
      hyphenate?: boolean

      /**
       * Controls how content is truncated when it exceeds the available space.
       * You can limit by characters, lines, or words.
       *
       * @default
       * { lines: 1 }
       */
      truncate?:
        | {
            /**
             * Maximum number of characters to display before truncating.
             * Content exceeding this limit will be cut off with an ellipsis.
             */
            characters: number
          }
        | {
            /**
             * Maximum number of lines to display before truncating.
             * Content exceeding this limit will be cut off with an ellipsis.
             */
            lines: number
          }
        | {
            /**
             * Maximum number of words to display before truncating.
             * Content exceeding this limit will be cut off with an ellipsis.
             */
            words: number
          }
    }

    /**
     * Configuration for the switch component that enables or disables the text input.
     *
     * @default
     * {
     *   offLabel: ({ __ }) => __('pruvious-dashboard', 'Off'),
     *   onLabel: ({ __ }) => __('pruvious-dashboard', 'On'),
     *   variant: 'primary',
     * }
     */
    switch?: {
      /**
       * Defines the label for the switch when the value is `null`.
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
       * ({ __ }) => __('pruvious-dashboard', 'Off')
       */
      offLabel?: string | ((context: TranslatableStringCallbackContext) => string)

      /**
       * Defines the label for the switch when the value is a string (not `null`).
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
       * ({ __ }) => __('pruvious-dashboard', 'On')
       */
      onLabel?: string | ((context: TranslatableStringCallbackContext) => string)

      /**
       * Defines the visual style variant of the switch.
       *
       * @default 'accent'
       */
      variant?: 'primary' | 'accent'
    }
  }
} = {
  ui: {
    dataTable: {
      hyphenate: true,
      truncate: { lines: 1 },
    },
    switch: {
      offLabel: ({ __ }) => __('pruvious-dashboard', 'Off'),
      onLabel: ({ __ }) => __('pruvious-dashboard', 'On'),
      variant: 'accent',
    },
  },
}

export default defineField({
  model: textFieldModel(),
  nullable: true,
  default: null,
  customOptions,
  uiOptions: { placeholder: true },
})
