import { defineField } from '#pruvious/server'
import { textFieldModel } from '@pruvious/orm'
import { isString } from '@pruvious/utils'

const customOptions: {
  /**
   * Controls if line breaks are allowed in the textarea.
   * When set to `false`, all line breaks will be automatically removed from the input.
   *
   * @default true
   */
  allowLineBreaks?: boolean

  ui?: {
    /**
     * Initial number of visible text lines.
     * Only used when `resize` is set to `false` or `'manual'`.
     *
     * @default 1
     */
    rows?: number

    /**
     * Controls how the textarea resizes.
     *
     * - `false` - Fixed height based on `rows`.
     * - `'manual'` - User can manually resize the textarea.
     * - `'auto'` - Automatically adjusts height based on content.
     *
     * @default 'auto'
     */
    resize?: false | 'manual' | 'auto'

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
  }
} = {
  allowLineBreaks: true,
  ui: {
    rows: 1,
    resize: 'auto',
    dataTable: {
      hyphenate: true,
      truncate: { lines: 1 },
    },
  },
}

export default defineField({
  model: textFieldModel(),
  sanitizers: [
    (value, { definition }) =>
      !definition.options.allowLineBreaks && isString(value) ? value.replace(/[ \t\n]*\n+[ \t\n]*/g, ' ') : value,
  ],
  customOptions,
  uiOptions: { placeholder: true },
})
