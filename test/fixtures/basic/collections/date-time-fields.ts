import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'date-time-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'date-time',
      options: {},
    },
    required: {
      type: 'date-time',
      options: {
        required: true,
      },
    },
    min: {
      type: 'date-time',
      options: {
        min: 1672531200000, // 2023-01-01 00:00:00
        default: 1686009601000, // 2023-06-06 00:00:01
      },
    },
    max: {
      type: 'date-time',
      options: {
        max: 1704067199999, // 2023-12-31 23:59:59
        default: 1686009601000, // 2023-06-06 00:00:01
      },
    },
  },
})
