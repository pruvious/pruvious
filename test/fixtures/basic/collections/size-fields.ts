import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'size-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'size',
      options: {},
    },
    default: {
      type: 'size',
      options: {
        default: { width: { value: 1337 }, height: { value: 3.14 } },
      },
    },
    required: {
      type: 'size',
      options: {
        required: true,
        inputs: {
          top: { min: 0, max: 64, units: ['px', 'em', 'rem'] },
          bottom: { min: -32, max: 64, units: ['px'] },
        },
      },
    },
  },
})
