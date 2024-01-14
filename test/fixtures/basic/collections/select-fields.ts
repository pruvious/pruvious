import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'select-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    default: {
      type: 'select',
      options: {
        choices: {
          foo: 'foo',
          bar: 'bar',
          1: '1',
        },
        default: '1',
      },
    },
    required: {
      type: 'select',
      options: {
        choices: {
          foo: 'foo',
          bar: 'bar',
          1: '1',
        },
        required: true,
      },
    },
  },
})
