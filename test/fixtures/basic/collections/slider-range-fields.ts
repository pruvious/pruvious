import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'slider-range-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'slider-range',
      options: {},
    },
    default: {
      type: 'slider-range',
      options: {
        default: [32, 64],
      },
    },
    required: {
      type: 'slider-range',
      options: {
        required: true,
        min: -9000,
        max: 9000,
        step: 1000,
        minRange: 2000,
        maxRange: 4000,
      },
    },
  },
})
