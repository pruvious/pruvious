import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'products',
  mode: 'multi',
  translatable: true,
  createdAtField: false,
  updatedAtField: false,
  search: {
    default: ['name', { field: 'isActive', extractKeywords: ({ value }) => (value ? 'active' : '') }],
    test: [{ field: 'price', fieldValueType: 'populated' }],
  },
  fields: {
    name: {
      type: 'text',
      options: { required: true },
      additional: { immutable: true, unique: 'perLanguage' },
    },
    isActive: {
      type: 'checkbox',
      options: {},
      additional: { index: true },
    },
    price: {
      type: 'number',
      options: { required: true },
      additional: { index: true },
    },
  },
})
