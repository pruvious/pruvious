import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  translatable: false,
  api: { create: false, update: false },
  fields: {
    code: textField({
      required: true,
      ui: {
        label: 'ISO code',
      },
    }),
    name: textField({
      required: true,
      ui: {
        label: 'Name',
      },
    }),
    capital: textField({
      ui: {
        label: 'Capital',
      },
    }),
  },
  ui: {
    indexPage: {
      dataTable: {
        columns: ['code', 'name', 'capital'],
      },
    },
  },
})
