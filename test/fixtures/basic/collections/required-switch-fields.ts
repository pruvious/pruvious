import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'required-switch-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    value: {
      type: 'switch',
      options: {
        required: true,
        default: true,
      },
    },
  },
})
