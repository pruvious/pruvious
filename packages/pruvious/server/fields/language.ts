import { defineField, isValidLanguageCode, type LanguageCode, languages, uniqueValidator } from '#pruvious/server'
import { textFieldModel } from '@pruvious/orm'
import { isString } from '@pruvious/utils'

const customOptions: {
  /**
   * The name of the field that contains the related `translationsField({})` to this `languageField({})`.
   *
   * @default 'translations'
   */
  translationsField?: string
} = {
  translationsField: 'translations',
}

export default defineField({
  model: textFieldModel<LanguageCode, LanguageCode, LanguageCode>(),
  nullable: true,
  default: null,
  validators: [
    (value, { context }) => {
      if (isString(value) && !isValidLanguageCode(value)) {
        throw new Error(context.__('pruvious-api', 'The language `$language` is not supported', { language: value }))
      }
    },
    (value, sanitizedFieldContext, errors) => {
      return uniqueValidator({
        fields: [sanitizedFieldContext.path, sanitizedFieldContext.definition.options.translationsField],
      errorMessage: ({ __ }) => __('pruvious-api', 'A translation for this language already exists'),
      })(value, sanitizedFieldContext, errors)
    },
  ],
  customOptions,
  uiOptions: { placeholder: true },
  castedTypeFn: () => languages.map(({ code }) => `'${code}' | `).join('') + 'null',
  populatedTypeFn: () => languages.map(({ code }) => `'${code}' | `).join('') + 'null',
  inputTypeFn: () => languages.map(({ code }) => `'${code}' | `).join('') + 'null',
})
