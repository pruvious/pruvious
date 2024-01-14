import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'number-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    value: {
      type: 'number',
      options: {
        default: 1337,
        min: 0,
        max: 9000,
        decimals: 2,
      },
    },
  },
})
