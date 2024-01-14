import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'text-area-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'text-area',
      options: {},
    },
    default: {
      type: 'text-area',
      options: {
        default: ' ',
        trim: false,
      },
    },
    required: {
      type: 'text-area',
      options: {
        required: true,
      },
    },
  },
})
