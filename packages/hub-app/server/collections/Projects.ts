import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    name: textField({
      required: true,
      unique: true,
    }),
    // @todo custom component for browsing server (local machine) paths
    path: textField({
      required: true,
    }),
  },
  ui: {
    label: ({ _ }) => _('Pruvious projects'),
    indexPage: {
      dataTable: {
        columns: ['name | 240px', 'path', 'createdAt | 150px'],
        orderBy: 'name:asc',
      },
    },
  },
})
