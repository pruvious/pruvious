import { defineField, type LanguageCode, languages, uniqueValidator } from '#pruvious/server'
import { textFieldModel } from '@pruvious/orm'
import { isString } from '@pruvious/utils'

const customOptions: {
  /**
   * The name of the field that contains the related `languageField({})` to this `translationsField({})`.
   *
   * @default 'language'
   */
  languageField?: string
} = {
  languageField: 'language',
}

export default defineField({
  model: textFieldModel<string, Record<LanguageCode, string | null>, string>(),
  nullable: true,
  default: null,
  validators: [
    (value, sanitizedFieldContext, errors) => {
      return uniqueValidator({
        fields: [sanitizedFieldContext.definition.options.languageField, sanitizedFieldContext.path],
        errorMessage: ({ __ }) => __('pruvious-api', 'A translation for this language already exists'),
      })(value, sanitizedFieldContext, errors)
    },
  ],
  populator: async (value, { context, definition, path }) => {
    if (context.collection?.meta.translatable && isString(value)) {
      const query = await context.database
        .queryBuilder()
        .selectFrom(context.collectionName as any)
        .select(['id', definition.options.languageField])
        .where(path, '=', value)
        .useCache(context.cache)
        .all()

      if (query.success) {
        return Object.fromEntries(
          languages.map(({ code }) => [code, query.data.find(({ language }) => language === code)?.id ?? null]),
        ) as any
      }
    }

    return value
  },
  customOptions,
  uiOptions: { placeholder: true },
  populatedTypeFn: () => `Record<${languages.map(({ code }) => `'${code}'`).join(' | ')}, number | null>`,
})
