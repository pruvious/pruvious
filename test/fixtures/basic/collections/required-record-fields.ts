import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'required-record-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    value: {
      type: 'record',
      options: {
        collection: 'users',
        fields: { id: true, email: true, capabilities: true, role: true },
        populate: true,
        required: true,
      },
    },
  },
})
