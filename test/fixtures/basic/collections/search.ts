import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'search',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  search: {
    default: ['text', 'checkboxes'],
    fooBar: ['checkboxes'],
  },
  fields: {
    text: {
      type: 'text',
      options: {},
    },
    checkboxes: {
      type: 'checkboxes',
      options: {
        choices: { 1: 'One', 2: 'Two' },
      },
    },
  },
})
