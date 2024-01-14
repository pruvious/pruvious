import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'chips-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    normal: {
      type: 'chips',
      options: {
        choices: {
          foo: 'foo',
          bar: 'bar',
          1: '1',
        },
        default: ['1'],
      },
    },
    required: {
      type: 'chips',
      options: {
        choices: {
          foo: 'foo',
          bar: 'bar',
          1: '1',
        },
        default: ['1'],
        required: true,
      },
    },
  },
})
