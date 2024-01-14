import { defineCollection, isString } from '#pruvious'

export default defineCollection({
  name: 'operation-specific-sanitizers-and-validators',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    value: {
      type: 'text',
      options: { default: 'qux' },
      additional: {
        sanitizers: [
          { onCreate: true, sanitizer: ({ value }) => (value === 'foo' ? 'bar' : value) },
          { onUpdate: true, sanitizer: ({ value }) => (value === 'bar' ? 'foo' : value) },
        ],
        validators: [
          {
            onCreate: true,
            validator: ({ value }) => {
              if (isString(value) && value !== value.toLowerCase()) {
                throw new Error('uppercase letters are not allowed')
              }
            },
          },
          {
            onRead: true,
            validator: ({ value }) => {
              if (value === 'bar') {
                throw new Error('bar is not allowed')
              }
            },
          },
          {
            onUpdate: true,
            validator: ({ value }) => {
              if (value === 'baz') {
                throw new Error('baz is not allowed')
              }
            },
          },
        ],
      },
    },
    test: {
      type: 'text',
      options: { required: true },
    },
  },
})
