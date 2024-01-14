import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'button-group-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    default: {
      type: 'button-group',
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
      type: 'button-group',
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
