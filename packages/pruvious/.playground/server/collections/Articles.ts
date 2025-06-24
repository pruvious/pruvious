import { defineCollection, numberField, repeaterField, textField } from '#pruvious/server'

export default defineCollection({
  translatable: true,
  fields: {
    name: textField({
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Product name'),
      },
    }),
    price: numberField({
      required: true,
      min: 0,
      decimalPlaces: 2,
      ui: {
        autoWidth: true,
        dragDirection: 'vertical',
        label: ({ __ }) => __('pruvious-dashboard', 'Price'),
        showDragButton: true,
        suffix: '€',
      },
    }),
    variants: repeaterField({
      subfields: {
        name: textField({
          required: true,
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Variant name'),
          },
        }),
      },
    }),
  },
  author: { strict: true },
  editors: { strict: true },
  routing: {
    publicFields: ['name'],
  },
  ui: {
    indexPage: {
      table: {
        columns: ['name', 'language', 'translations', 'createdAt'],
      },
    },
    createPage: {
      fieldsLayout: [{ row: ['name', 'price | auto'] }, 'variants'],
    },
    updatePage: {
      fieldsLayout: 'mirror',
    },
  },
  copyTranslation: ({ source }) => ({ ...source, author: useEvent().context.pruvious.auth.user?.id }),
  duplicate: ({ source }) => ({ ...source, author: useEvent().context.pruvious.auth.user?.id }),
})
