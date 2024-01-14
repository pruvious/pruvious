import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'partially-public',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  apiRoutes: {
    create: 'public',
    createMany: false,
    read: 'public',
    readMany: false,
    update: false,
    updateMany: false,
    delete: false,
    deleteMany: false,
  },
  fields: {
    name: {
      type: 'text',
      options: {},
    },
  },
})
