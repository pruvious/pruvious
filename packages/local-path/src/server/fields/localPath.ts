import { defineField, type TranslatableStringCallbackContext } from '#pruvious/server'
import { textFieldModel } from '@pruvious/orm'
import { isEmpty } from '@pruvious/utils'
import fs from 'node:fs'

const customOptions: {
  /**
   * The directory to display when the finder popup first opens.
   *
   * Supports absolute paths, relative paths, or `~` (user home directory).
   * If not provided, defaults to the server working directory.
   *
   * @example
   * ```ts
   * '/absolute/path/to/directory'
   * '../relative/path/to/directory'
   * '~/path/to/directory'
   * ```
   */
  initialDirectory?: string

  /**
   * Defines the type of items the user is allowed to select.
   *
   * @default 'any'
   */
  selectionType?: 'any' | 'file' | 'directory'

  ui?: {
    /**
     * The label for the select button.
     *
     * If not provided, a default label will be used depending on the `selectionType` option value:
     *
     * - `any`: __('pruvious-dashboard', 'Select path')
     * - `file`: __('pruvious-dashboard', 'Select file')
     * - `directory`: __('pruvious-dashboard', 'Select directory')
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
     * label: 'Select document'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Select document')
     * ```
     */
    selectLabel?: string | ((context: TranslatableStringCallbackContext) => string)
  }
} = {
  initialDirectory: undefined,
  selectionType: 'any',
  ui: {},
}

export default defineField({
  model: textFieldModel(),
  customOptions,
  validators: [
    (value, { definition, context }) => {
      if (!isEmpty(value)) {
        try {
          const stats = fs.statSync(value)

          if (definition.options.selectionType === 'file' && !stats.isFile()) {
            throw new Error(context.__('pruvious-api', 'The path `$path` must be a file', { path: value }))
          }

          if (definition.options.selectionType === 'directory' && !stats.isDirectory()) {
            throw new Error(context.__('pruvious-api', 'The path `$path` must be a directory', { path: value }))
          }
        } catch (error) {
          throw new Error(
            context.__('pruvious-api', 'The path `$path` does not exist or is not accessible', { path: value }),
          )
        }
      }
    },
  ],
})
