import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'date-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'date',
      options: {},
    },
    required: {
      type: 'date',
      options: {
        required: true,
      },
    },
    min: {
      type: 'date',
      options: {
        min: 1672531200000, // 2023-01-01 00:00:00
        default: 1686009600000, // 2023-06-06 00:00:00
      },
    },
    max: {
      type: 'date',
      options: {
        max: 1704067199999, // 2024-12-31 23:59:59
        default: 1686009600000, // 2023-06-06 00:00:00
      },
    },
  },
})
