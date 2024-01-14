import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'required-text-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    value: {
      type: 'text',
      options: {
        required: true,
        default: 'foo',
        trim: false,
      },
    },
  },
})
