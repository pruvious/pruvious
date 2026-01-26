import { defineCollection, localPathField, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    name: textField({
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Project name'),
      },
    }),
    path: localPathField({
      selectionType: 'directory',
      initialDirectory: '~',
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Source directory'),
        description: ({ __ }) => __('pruvious-dashboard', 'Path to the project directory.'),
      },
      validators: [
        // @todo validate if directory is a valid Pruvious project (look for dependencies and devDependencies in package.json)
      ],
    }),
  },
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Pruvious projects'),
    icon: 'brand-nuxt',
    menu: {
      group: 'general',
      order: 2,
    },
    indexPage: {
      dataTable: {
        columns: ['name | 240px', 'path', 'createdAt | 150px'],
        orderBy: 'name:asc',
      },
    },
  },
})
