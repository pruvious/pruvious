import { chipsField, defineTemplate, permissions, textField } from '#pruvious/server'

export default defineTemplate(() => ({
  fields: {
    name: textField({
      required: true,
    }),
    permissions: chipsField({
      // @todo hide `collection:{slug}:manage` permissions from the UI for collections that have disabled the `author` and `editors` fields
      choices: permissions.map((value) => ({ value })),
      enforceUniqueItems: true,
    }),
  },
  indexes: [{ fields: ['name'], unique: true }],
  translatable: false,
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Roles'),
    icon: 'shield',
    menu: { group: 'management', order: 2 },
  },
}))
