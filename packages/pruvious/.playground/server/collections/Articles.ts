import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  translatable: true,
  fields: {
    name: textField({
      required: true,
    }),
  },
  author: { strict: true },
  editors: { strict: true },
  ui: {
    indexPage: {
      table: {
        columns: ['name', 'language', 'translations', 'createdAt'],
      },
    },
  },
  copyTranslation: ({ source }) => ({ ...source, author: useEvent().context.pruvious.auth.user?.id }),
  duplicate: ({ source }) => ({ ...source, author: useEvent().context.pruvious.auth.user?.id }),
})
