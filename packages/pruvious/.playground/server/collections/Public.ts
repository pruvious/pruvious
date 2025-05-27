import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    foo: textField({}),
  },
  authGuard: false,
  translatable: false,
  createdAt: false,
  updatedAt: false,
  routing: {
    mode: 'record',
    publicFields: ['id', 'foo'],
  },
})
