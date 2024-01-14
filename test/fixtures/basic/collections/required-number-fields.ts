import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'required-number-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    value: {
      type: 'number',
      options: {
        required: true,
        default: 1337,
      },
    },
  },
})
