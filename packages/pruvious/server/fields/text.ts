import { defineField } from '#pruvious/server'
import { textFieldModel } from '@pruvious/orm'

const customOptions: {
  ui?: {
    /**
     * Options for configuring the table view appearance.
     *
     * @default
     * { hyphenate: false, truncate: { lines: 1 } }
     */
    table?: {
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
  ui: {
    table: {
      hyphenate: true,
      truncate: { lines: 1 },
    },
  },
}

export default defineField({
  model: textFieldModel(),
  customOptions,
  uiOptions: { placeholder: true },
})
