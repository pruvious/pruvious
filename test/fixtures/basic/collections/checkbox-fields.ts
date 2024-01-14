import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'checkbox-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    value: {
      type: 'checkbox',
      options: {
        default: true,
      },
    },
  },
})
