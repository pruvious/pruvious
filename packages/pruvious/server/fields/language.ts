import { defineField, isValidLanguageCode, type LanguageCode, uniqueValidator } from '#pruvious/server'
import { textFieldModel } from '@pruvious/orm'
import { isString } from '@pruvious/utils'

export default defineField({
  model: textFieldModel<string, LanguageCode, string>(),
  nullable: true,
  default: null,
  validators: [
    (value, { context }) => {
      if (isString(value) && !isValidLanguageCode(value)) {
        return context.__('pruvious-api', 'The language `$language` is not supported', { language: value })
      }
    },
    uniqueValidator(['language', 'translations'], ({ __ }) =>
      __('pruvious-api', 'A translation for this language already exists'),
    ),
  ],
  uiOptions: { placeholder: true },
})
