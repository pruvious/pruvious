import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'translatable-fields-single',
  mode: 'single',
  translatable: true,
  fields: {
    testValue1: {
      type: 'text',
      options: { default: 'default' },
      additional: { translatable: false },
    },
    testValue2: {
      type: 'text',
      options: { default: 'default' },
    },
  },
})
