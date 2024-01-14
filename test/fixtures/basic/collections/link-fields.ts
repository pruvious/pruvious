import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'link-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'link',
      options: {},
    },
    default: {
      type: 'link',
      options: {
        default: '#foo',
      },
    },
    required: {
      type: 'link',
      options: {
        required: true,
      },
    },
  },
})
