import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'date-time-range-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'date-time-range',
      options: {},
    },
    required: {
      type: 'date-time-range',
      options: {
        required: true,
      },
    },
    min: {
      type: 'date-time-range',
      options: {
        min: 1672531200000, // 2023-01-01 00:00:00
        default: [1686009601000, 1686009601000], // 2023-06-06 00:00:01
      },
    },
    max: {
      type: 'date-time-range',
      options: {
        max: 1704067199999, // 2023-12-31 23:59:59
        default: [1686009601000, 1686009601000], // 2023-06-06 00:00:01
      },
    },
  },
})
