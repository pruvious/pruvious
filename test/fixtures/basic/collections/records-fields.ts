import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'records-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    users: {
      type: 'records',
      options: {
        collection: 'users',
      },
    },
    roles: {
      type: 'records',
      options: {
        collection: 'roles',
      },
    },
    populatedUsers: {
      type: 'records',
      options: {
        collection: 'users',
        populate: true,
        fields: { id: true, role: true },
      },
    },
    populatedRoles: {
      type: 'records',
      options: {
        collection: 'roles',
        populate: true,
      },
    },
    requiredUsers: {
      type: 'records',
      options: {
        collection: 'users',
        required: true,
      },
    },
  },
})
