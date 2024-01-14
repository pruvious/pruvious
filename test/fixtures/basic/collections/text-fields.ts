import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'text-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    value: {
      type: 'text',
      options: {
        default: 'foo',
      },
    },
  },
})
