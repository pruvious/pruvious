import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'conditional-logic-single',
  mode: 'single',
  translatable: false,
  fields: {
    foo: {
      type: 'text',
      options: {},
      additional: {
        conditionalLogic: { $some: [{ bar: 'bar' }, { bar: 'baz' }] },
      },
    },
    bar: {
      type: 'text',
      options: {},
    },
  },
})
