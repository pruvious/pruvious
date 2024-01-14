import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'slider-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'slider',
      options: {},
    },
    default: {
      type: 'slider',
      options: {
        default: 64,
      },
    },
    required: {
      type: 'slider',
      options: {
        required: true,
        min: -9000,
        max: 9000,
        step: 1000,
      },
    },
  },
})
