import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'editor-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'editor',
      options: {},
    },
    default: {
      type: 'editor',
      options: {
        default: '<h1></h1>',
      },
    },
    required: {
      type: 'editor',
      options: {
        required: true,
      },
    },
  },
})
