import {
  dateTimeField,
  dateTimeRangeField,
  defineCollection,
  numberField,
  repeaterField,
  textField,
  timeField,
} from '#pruvious/server'

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
    approvedAt: dateTimeField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Approved at'),
        timezone: 'Europe/Berlin',
      },
    }),
    restockTime: timeField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Restock time'),
      },
    }),
    promotionPeriod: dateTimeRangeField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Promotion period'),
        timezone: 'Europe/Berlin',
      },
    }),
    // @todo processingHours: timeRangeField({}),
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
      fields: [
        { row: ['name', { field: { name: 'price', style: { flexShrink: 0, width: 'auto' } } }] },
        'variants',
        { row: ['approvedAt', 'restockTime'] },
        'promotionPeriod',
        // @todo 'processingHours',
      ],
    },
    updatePage: {
      fields: 'mirror',
    },
  },
  copyTranslation: ({ source }) => ({ ...source, author: useEvent().context.pruvious.auth.user?.id }),
  duplicate: ({ source }) => ({ ...source, author: useEvent().context.pruvious.auth.user?.id }),
})
