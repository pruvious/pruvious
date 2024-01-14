import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'repeater-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    empty: {
      type: 'repeater',
      options: {
        subfields: {},
      },
    },
    normal: {
      type: 'repeater',
      options: {
        subfields: {
          foo: {
            type: 'text',
            options: { required: true },
            additional: { conditionalLogic: { bar: true } },
          },
          bar: {
            type: 'checkbox',
            options: {},
          },
        },
        default: [{ foo: 'foo', bar: true }],
        min: 1,
        max: 2,
      },
    },
    nested: {
      type: 'repeater',
      options: {
        subfields: {
          user: {
            type: 'record',
            options: {
              collection: 'users',
              fields: { role: true, capabilities: true },
              populate: true,
            },
          },
          sub: {
            type: 'repeater',
            options: {
              subfields: {
                user: {
                  type: 'record',
                  options: {
                    collection: 'users',
                    fields: { role: true },
                  },
                },
              },
              required: true,
              min: 1,
              max: 2,
            },
          },
        },
      },
    },
  },
})
