import { type Collections, defineField, type LanguageCode, languages, uniqueValidator } from '#pruvious/server'
import { textFieldModel } from '@pruvious/orm'
import { isString } from '@pruvious/utils'

export default defineField({
  model: textFieldModel<string, Record<LanguageCode, string | null>, string>(),
  nullable: true,
  default: null,
  validators: [
    uniqueValidator({
      fields: ['language', 'translations'],
      errorMessage: ({ __ }) => __('pruvious-api', 'A translation for this language already exists'),
    }),
  ],
  populator: async (value, { context }) => {
    if (context.collection?.meta.translatable && isString(value)) {
      const query = await context.database
        .queryBuilder()
        .selectFrom(context.collectionName as keyof Collections)
        .select(['id', 'language'])
        .where('translations', '=', value)
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
  populatedTypeFn: () => `Record<${languages.map(({ code }) => `'${code}'`).join(' | ')}, number | null>`,
  uiOptions: { placeholder: true },
})
