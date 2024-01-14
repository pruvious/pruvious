import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'conditional-logic-multi',
  mode: 'multi',
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
