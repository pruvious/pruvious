import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'record-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    value: {
      type: 'record',
      options: {
        collection: 'users',
        fields: { email: true, capabilities: true, role: true },
      },
    },
  },
})
