import { chipsField, defineTemplate, permissions, textField } from '#pruvious/server'

export default defineTemplate(() => ({
  fields: {
    name: textField({
      required: true,
      unique: true,
    }),
    permissions: chipsField({
      choices: permissions.map((value) => ({ value })),
      enforceUniqueItems: true,
    }),
  },
  translatable: false,
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Roles'),
    icon: 'shield',
    menu: { group: 'management', order: 2 },
  },
}))
