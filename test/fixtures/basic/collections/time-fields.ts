import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'time-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'time',
      options: {},
    },
    required: {
      type: 'time',
      options: {
        required: true,
      },
    },
    min: {
      type: 'time',
      options: {
        min: 21600000, // 06:00
        default: 32400000, // 09:00
      },
    },
    max: {
      type: 'time',
      options: {
        max: 64800000, // 18:00
        default: 32400000, // 09:00
      },
    },
  },
})
