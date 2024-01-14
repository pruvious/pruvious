import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'required-checkbox-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    value: {
      type: 'checkbox',
      options: {
        required: true,
        default: true,
      },
    },
  },
})
