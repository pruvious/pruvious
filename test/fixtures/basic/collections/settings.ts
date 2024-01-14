import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'settings',
  mode: 'single',
  translatable: true,
  createdAtField: false,
  updatedAtField: false,
  label: 'Theme Options',
  fields: {
    normal: {
      type: 'text',
      options: {},
    },
    required: {
      type: 'text',
      options: { required: true, default: 'required' },
    },
    immutable: {
      type: 'text',
      options: {},
      additional: { immutable: true },
    },
    populated: {
      type: 'text',
      options: {},
      additional: { population: { type: 'string', populator: ({ value }) => `${value}!` } },
    },
  },
})
