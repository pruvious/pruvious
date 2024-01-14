import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'disabled',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  apiRoutes: {
    create: false,
    createMany: false,
    read: false,
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
