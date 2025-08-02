import { defineCollection, languageField, translationsField } from '#pruvious/server'

export default defineCollection({
  fields: {
    languageTest: languageField({ translationsField: 'translationsTest' }),
    translationsTest: translationsField({ languageField: 'languageTest' }),
  },
  createdAt: false,
  updatedAt: false,
  ui: { hidden: true },
})
