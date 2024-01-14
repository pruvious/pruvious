import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'time-range-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'time-range',
      options: {},
    },
    required: {
      type: 'time-range',
      options: {
        required: true,
      },
    },
    min: {
      type: 'time-range',
      options: {
        min: 21600000, // 06:00
        default: [32400000, 32400000], // 09:00
      },
    },
    max: {
      type: 'time-range',
      options: {
        max: 64800000, // 18:00
        default: [32400000, 32400000], // 09:00
      },
    },
  },
})
