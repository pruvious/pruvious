import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'icon-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'icon',
      options: {},
    },
    default: {
      type: 'icon',
      options: {
        default: 'Test',
      },
    },
    required: {
      type: 'icon',
      options: {
        required: true,
        allow: ['Test', 'Bar'],
        exclude: ['Bar'],
      },
    },
  },
})
