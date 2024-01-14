import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'switch-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    value: {
      type: 'switch',
      options: {
        default: true,
      },
    },
  },
})
