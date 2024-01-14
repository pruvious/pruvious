import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'range-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'range',
      options: {},
    },
    default: {
      type: 'range',
      options: {
        default: [32, 64],
      },
    },
    required: {
      type: 'range',
      options: {
        required: true,
        min: -9000,
        max: 9000,
        step: 1000,
        decimals: 2,
        minRange: 2000,
        maxRange: 4000,
      },
    },
  },
})
