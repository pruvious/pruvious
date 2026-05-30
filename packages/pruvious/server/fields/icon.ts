import { defineField, pruviousIconNames, type PruviousIconDir } from '#pruvious/server'
import { textFieldModel } from '@pruvious/orm'
import { isEmpty, isNotNull, isString } from '@pruvious/utils'
import { resolveIconDir } from '../../modules/pruvious/icons/utils.server'

interface CustomOptions {
  /**
   * Basename of one of the directories configured via `pruvious.dir.icons`.
   * Defaults to the first configured directory.
   */
  dir?: PruviousIconDir

  ui?: {
    /**
     * Columns rendered in the icon picker grid.
     *
     * @default 6
     */
    columns?: number

    /**
     * Checkerboard background variant rendered behind the icon preview and in the picker.
     *
     * - `'light'` - always use the light checkerboard, regardless of dashboard theme.
     * - `'dark'` - always use the dark checkerboard.
     * - `'auto'` - follow the dashboard theme.
     *
     * @default 'auto'
     */
    background?: 'light' | 'dark' | 'auto'
  }
}

const customOptions: CustomOptions = {
  dir: undefined,
  ui: { columns: 6, background: 'auto' },
}

export default defineField({
  model: textFieldModel(),
  nullable: true,
  default: null,
  customOptions,
  uiOptions: { placeholder: true },
  validators: [
    (value, { context, definition }) => {
      if (!isNotNull(value)) {
        return
      }

      if (!isString(value) || isEmpty(value)) {
        throw new Error(context.__('pruvious-orm', 'Invalid value'))
      }

      const resolved = resolveIconDir((definition.options as any).dir)
      if (resolved.kind !== 'resolved') {
        throw new Error(context.__('pruvious-api', 'Invalid icon directory'))
      }

      if (!pruviousIconNames[resolved.prefix]?.includes(value)) {
        throw new Error(context.__('pruvious-api', 'Icon not found'))
      }
    },
  ],
})
