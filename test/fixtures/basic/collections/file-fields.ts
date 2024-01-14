import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'file-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'file',
      options: {},
    },
    required: {
      type: 'file',
      options: {
        required: true,
      },
    },
    jpg: {
      type: 'file',
      options: {
        allowedTypes: ['image/jpeg'],
      },
    },
    b1: {
      type: 'file',
      options: {
        maxSize: '1 B',
      },
    },
  },
})
