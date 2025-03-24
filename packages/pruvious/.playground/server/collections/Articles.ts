import { defineCollection, numberField, repeaterField, textField } from '#pruvious/server'

export default defineCollection({
  translatable: true,
  fields: {
    name: textField({
      required: true,
    }),
    price: numberField({
      required: true,
      min: 0,
      decimalPlaces: 2,
      ui: { autoWidth: true, dragDirection: 'vertical', showDragButton: true, suffix: '€' },
    }),
    variants: repeaterField({
      subfields: {
        name: textField({
          required: true,
        }),
      },
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
    createPage: {
      fields: [{ row: ['name', { field: { name: 'price', style: { flexShrink: 0, width: 'auto' } } }] }, 'variants'],
    },
  },
  copyTranslation: ({ source }) => ({ ...source, author: useEvent().context.pruvious.auth.user?.id }),
  duplicate: ({ source }) => ({ ...source, author: useEvent().context.pruvious.auth.user?.id }),
})
