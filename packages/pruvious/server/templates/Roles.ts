import { chipsField, defineTemplate, permissions, textField } from '#pruvious/server'

export default defineTemplate(() => ({
  fields: {
    name: textField({
      required: true,
    }),
    permissions: chipsField({
      // @todo hide `collection:{slug}:manage` permissions from the UI for collections that have disabled the `author` and `editors` fields
      enforceUniqueItems: true,
      allowValues: permissions,
    }),
  },
  indexes: [{ fields: ['name'], unique: true }],
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Roles'),
    menu: { group: 'management', icon: 'shield', order: 2 },
  },
}))
